import crypto from 'crypto';
import express from 'express';
import { body, param } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { checkSelfExclusion, checkSpendingLimits } from '../middleware/responsiblePlay.js';
import { generateDrawSeed, createCommitmentHash, determineWinner } from '../utils/crypto.js';
import { emailService } from '../utils/email.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(authenticateToken);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode() {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

/**
 * POST /api/lobby/create
 */
router.post(
  '/create',
  [body('name').isLength({ min: 1, max: 100 }), body('maxParticipants').optional().isInt({ min: 2, max: 100 })],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { name, maxParticipants = 10 } = req.body;

      const result = await transaction(async (client) => {
        let code = genCode();
        let attempts = 0;
        while (attempts++ < 10) {
          const existing = await client.query('SELECT 1 FROM lobbies WHERE code = $1', [code]);
          if (existing.rows.length === 0) break;
          code = genCode();
        }

        const drawSeed = generateDrawSeed();
        const commitmentHash = createCommitmentHash(drawSeed);
        const lobbyResult = await client.query(
          `INSERT INTO lobbies (host_id, name, max_participants, code, prize_pool, commitment_hash, seed, status)
           VALUES ($1, $2, $3, $4, 0, $5, $6, 'open')
           RETURNING id, code, name, host_id, max_participants, prize_pool, commitment_hash, status, created_at`,
          [userId, name, maxParticipants, code, commitmentHash, drawSeed]
        );
        const lobby = lobbyResult.rows[0];

        await client.query(
          `INSERT INTO lobby_members (lobby_id, user_id) VALUES ($1, $2)`,
          [lobby.id, userId]
        );

        return { lobby };
      });

      logger.info(`Lobby created: ${result.lobby.id} by ${userId}`);
      res.status(201).json({ lobby: result.lobby });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/lobby/join
 */
router.post(
  '/join',
  [body('code').isLength({ min: 4, max: 8 })],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const code = String(req.body.code).toUpperCase().trim();

      const lobbyResult = await query(
        `SELECT id, name, code, status, max_participants, prize_pool 
         FROM lobbies WHERE code = $1`,
        [code]
      );
      if (lobbyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }
      const lobby = lobbyResult.rows[0];
      if (lobby.status !== 'open') {
        return res.status(400).json({ error: 'Room is not accepting members' });
      }

      const countResult = await query(
        'SELECT COUNT(*)::int as count FROM lobby_members WHERE lobby_id = $1',
        [lobby.id]
      );
      if (countResult.rows[0].count >= lobby.max_participants) {
        return res.status(400).json({ error: 'Room is full' });
      }

      await query(
        `INSERT INTO lobby_members (lobby_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [lobby.id, userId]
      );

      logger.info(`User ${userId} joined lobby ${lobby.id}`);
      res.json({ lobby: { id: lobby.id, code: lobby.code, name: lobby.name } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/lobby/:id/leave
 */
router.post('/:id/leave', [param('id').isUUID()], handleValidationErrors, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await query(
      'DELETE FROM lobby_members WHERE lobby_id = $1 AND user_id = $2',
      [id, userId]
    );
    res.json({ message: 'Left room' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/lobby/my-rooms/list
 */
router.get('/my-rooms/list', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT l.id, l.code, l.name, l.host_id, l.prize_pool, l.status, l.max_participants,
              (SELECT COUNT(*) FROM lobby_members WHERE lobby_id = l.id) as member_count,
              u.username as host_username
       FROM lobby_members lm
       JOIN lobbies l ON l.id = lm.lobby_id
       JOIN users u ON u.id = l.host_id
       WHERE lm.user_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );

    res.json({ lobbies: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/lobby/:id
 */
router.get('/:id', [param('id').isUUID()], handleValidationErrors, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const lobbyResult = await query(
      `SELECT l.id, l.code, l.name, l.host_id, l.prize_pool, l.status, l.max_participants, l.created_at,
              l.commitment_hash, l.seed, l.winning_position,
              u.username as host_username
       FROM lobbies l
       JOIN users u ON u.id = l.host_id
       WHERE l.id = $1`,
      [id]
    );
    if (lobbyResult.rows.length === 0) return res.status(404).json({ error: 'Room not found' });

    const lobby = lobbyResult.rows[0];

    const membersResult = await query(
      `SELECT lm.user_id, lm.joined_at, lm.has_ticket, lm.ticket_position, u.username
       FROM lobby_members lm
       JOIN users u ON u.id = lm.user_id
       WHERE lm.lobby_id = $1
       ORDER BY lm.joined_at`,
      [id]
    );

    const isMember = membersResult.rows.some(m => m.user_id === userId);
    if (!isMember) return res.status(403).json({ error: 'Not a member of this room' });

    // Only expose seed after draw (provably fair reveal)
    if (lobby.status !== 'drawn') {
      delete lobby.seed;
    }

    lobby.members = membersResult.rows;
    lobby.isHost = lobby.host_id === userId;
    res.json({ lobby });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/lobby/:id/seed
 * Host seeds the prize pool (Model A)
 */
router.post(
  '/:id/seed',
  [param('id').isUUID(), body('amount').isFloat({ min: 1 })],
  handleValidationErrors,
  checkSelfExclusion,
  checkSpendingLimits,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { amount } = req.body;

      const result = await transaction(async (client) => {
        const lobbyResult = await client.query(
          'SELECT id, host_id, status FROM lobbies WHERE id = $1 FOR UPDATE',
          [id]
        );
        if (lobbyResult.rows.length === 0) throw Object.assign(new Error('Room not found'), { statusCode: 404 });
        const lobby = lobbyResult.rows[0];
        if (lobby.host_id !== userId) throw Object.assign(new Error('Only host can seed pot'), { statusCode: 403 });
        if (lobby.status !== 'open') throw Object.assign(new Error('Room is locked'), { statusCode: 400 });

        const walletResult = await client.query(
          'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
          [userId]
        );
        if (walletResult.rows.length === 0) throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
        const wallet = walletResult.rows[0];
        if (parseFloat(wallet.balance) < amount) throw Object.assign(new Error('Insufficient balance'), { statusCode: 400 });

        await client.query(
          'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
          [amount, wallet.id]
        );
        await client.query(
          'UPDATE lobbies SET prize_pool = prize_pool + $1 WHERE id = $2',
          [amount, id]
        );
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, metadata)
           VALUES ($1, 'withdrawal', $2, 'completed', $3)`,
          [userId, amount, JSON.stringify({ reason: 'lobby_seed', lobby_id: id })]
        );

        const updated = await client.query('SELECT prize_pool FROM lobbies WHERE id = $1', [id]);
        return { prizePool: parseFloat(updated.rows[0].prize_pool) };
      });

      logger.info(`Lobby ${id} seeded with $${amount} by ${userId}`);
      res.json({ message: 'Pot seeded', prizePool: result.prizePool });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/lobby/:id/draw
 * Host triggers instant draw (min 2 participants, min pot > 0)
 */
router.post('/:id/draw', [param('id').isUUID()], handleValidationErrors, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await transaction(async (client) => {
      const lobbyResult = await client.query(
        `SELECT id, host_id, prize_pool, status, commitment_hash, seed FROM lobbies WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (lobbyResult.rows.length === 0) throw Object.assign(new Error('Room not found'), { statusCode: 404 });
      const lobby = lobbyResult.rows[0];
      if (lobby.host_id !== userId) throw Object.assign(new Error('Only host can trigger draw'), { statusCode: 403 });
      if (lobby.status !== 'open') throw Object.assign(new Error('Draw already completed'), { statusCode: 400 });

      const membersResult = await client.query(
        `SELECT lm.user_id, u.username FROM lobby_members lm
         JOIN users u ON u.id = lm.user_id WHERE lm.lobby_id = $1`,
        [id]
      );
      if (membersResult.rows.length < 2) throw Object.assign(new Error('Minimum 2 participants required'), { statusCode: 400 });

      const prizePool = parseFloat(lobby.prize_pool);
      if (prizePool <= 0) throw Object.assign(new Error('Pot must be funded before draw'), { statusCode: 400 });

      // Use pre-committed seed (provably fair)
      let seed = lobby.seed;
      let commitmentHashForResponse = lobby.commitment_hash;
      if (!seed || !lobby.commitment_hash) {
        seed = crypto.randomBytes(32).toString('hex');
        commitmentHashForResponse = createCommitmentHash(seed);
        await client.query(
          `UPDATE lobbies SET commitment_hash = $1, seed = $2 WHERE id = $3`,
          [commitmentHashForResponse, seed, id]
        );
      } else {
        const computedHash = createCommitmentHash(seed);
        if (computedHash !== lobby.commitment_hash) {
          throw Object.assign(new Error('Commitment verification failed'), { statusCode: 500 });
        }
      }

      await client.query(
        "UPDATE lobbies SET status = 'locked' WHERE id = $1",
        [id]
      );

      const totalEntries = membersResult.rows.length;
      const winningIndex = determineWinner(seed, totalEntries);
      const winner = membersResult.rows[winningIndex];

      const adminFee = Math.floor(prizePool * 0.01 * 100) / 100;
      const winnerAmount = Math.round((prizePool - adminFee) * 100) / 100;

      await client.query(
        'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
        [winnerAmount, winner.user_id]
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, metadata)
         VALUES ($1, 'prize_win', $2, 'completed', $3)`,
        [winner.user_id, winnerAmount, JSON.stringify({ reason: 'lobby_win', lobby_id: id })]
      );

      const adminResult = await client.query(
        `SELECT id FROM users WHERE email = 'admin@dailydollar.com'`
      );
      if (adminResult.rows.length > 0 && adminFee > 0) {
        await client.query(
          'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
          [adminFee, adminResult.rows[0].id]
        );
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, metadata)
           VALUES ($1, 'deposit', $2, 'completed', $3)`,
          [adminResult.rows[0].id, adminFee, JSON.stringify({ reason: 'admin_fee', lobby_id: id })]
        );
      }

      await client.query(
        `UPDATE lobbies SET status = 'drawn', drawn_at = NOW(), winning_position = $1 WHERE id = $2`,
        [winningIndex, id]
      );

      // Send winner notification email (lobby draw)
      const winnerUserResult = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [winner.user_id]
      );
      if (winnerUserResult.rows[0]?.email) {
        emailService.sendWinnerNotification(
          winnerUserResult.rows[0].email,
          winner.username,
          `Lobby-${id.substring(0, 8)}`,
          String(winnerAmount),
          new Date().toISOString().split('T')[0]
        ).catch(err => logger.warn('Lobby winner email failed:', err));
      }

      return {
        winnerId: winner.user_id,
        winnerUsername: winner.username,
        prizeAmount: winnerAmount,
        adminFee,
        seed,
        commitmentHash: commitmentHashForResponse,
        winningPosition: winningIndex,
        totalEntries,
      };
    });

    logger.info(`Lobby draw: ${id}, winner=${result.winnerUsername}`);
    res.json({ message: 'Draw complete', ...result });
  } catch (error) {
    next(error);
  }
});

export default router;

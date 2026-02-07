import express from 'express';
import { param } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { generateDrawSeed, createCommitmentHash, determineWinner } from '../utils/crypto.js';
import { broadcastDrawResult } from '../websocket/index.js';
import { emailService } from '../utils/email.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/draws/today
 * Get today's active draw
 */
router.get('/today', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, draw_date, prize_pool, total_entries, status, commitment_hash, created_at
       FROM draws
       WHERE draw_date = CURRENT_DATE
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active draw for today' });
    }

    res.json({
      draw: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/draws/last-winner
 * Get most recent draw winner for display
 */
router.get('/last-winner', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.id, d.prize_pool, d.winning_position,
              u.username,
              t.id as ticket_id, t.prize_amount
       FROM draws d
       LEFT JOIN tickets t ON t.draw_id = d.id AND t.position = d.winning_position
       LEFT JOIN users u ON u.id = t.user_id
       WHERE d.status = 'drawn' AND d.winning_position IS NOT NULL
       ORDER BY d.drawn_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0 || !result.rows[0].username) {
      return res.json({ winner: null });
    }

    const row = result.rows[0];
    const prizeAmount = row.prize_amount != null ? parseFloat(row.prize_amount) : parseFloat(row.prize_pool) * 0.99;
    res.json({
      winner: {
        username: row.username,
        amount: Math.round(prizeAmount * 100) / 100,
        ticketId: String(row.winning_position),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/draws/:drawId
 * Get specific draw details
 */
router.get(
  '/:drawId',
  [
    param('drawId').isUUID(),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { drawId } = req.params;

      const result = await query(
        `SELECT id, draw_date, prize_pool, total_entries, commitment_hash, 
                seed, status, winning_position, created_at, drawn_at
         FROM draws
         WHERE id = $1`,
        [drawId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Draw not found' });
      }

      const draw = result.rows[0];

      // Only expose seed after draw is complete (provably fair reveal)
      if (draw.status !== 'drawn') {
        delete draw.seed;
      }

      // If draw is completed, get winner info
      if (draw.status === 'drawn' && draw.winning_position !== null) {
        const winnerResult = await query(
          `SELECT t.id as ticket_id, u.username, t.position
           FROM tickets t
           JOIN users u ON t.user_id = u.id
           WHERE t.draw_id = $1 AND t.position = $2`,
          [drawId, draw.winning_position]
        );

        if (winnerResult.rows.length > 0) {
          draw.winner = winnerResult.rows[0];
        }
      }

      res.json({
        draw,
      });
    } catch (error) {
    next(error);
  }
});

/**
 * GET /api/draws
 * Get draw history
 */
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;

    let queryText = `
      SELECT id, draw_date, prize_pool, total_entries, status, 
             winning_position, created_at, drawn_at
      FROM draws
    `;

    const params = [];
    if (status) {
      queryText += ' WHERE status = $1';
      params.push(status);
    }

    queryText += ' ORDER BY draw_date DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    res.json({
      draws: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Middleware: allow cron secret to bypass auth for execute/create-next
 */
function cronOrAuth(req, res, next) {
  const secret = req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET || 'dev-cron-secret';
  if (secret && secret === expectedSecret) {
    req.user = { id: 'cron', isCron: true };
    return next();
  }
  return authenticateToken(req, res, next);
}

/**
 * POST /api/draws/execute
 * Execute today's draw (admin or cron)
 */
router.post('/execute', cronOrAuth, async (req, res, next) => {
  try {
    // TODO: Add admin role check
    // if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const result = await transaction(async (client) => {
      // Get today's open draw
      const drawResult = await client.query(
        `SELECT id, draw_date, total_entries, commitment_hash, seed, status
         FROM draws
         WHERE draw_date = CURRENT_DATE AND status = 'open'
         FOR UPDATE`
      );

      if (drawResult.rows.length === 0) {
        throw Object.assign(new Error('No open draw to execute'), { statusCode: 400 });
      }

      const draw = drawResult.rows[0];

      if (!draw.seed) {
        throw Object.assign(
          new Error('Draw was not initialized with provable fairness (missing pre-committed seed). Run create-next or backfill.'),
          { statusCode: 500 }
        );
      }

      if (draw.total_entries === 0) {
        throw Object.assign(new Error('No tickets sold for this draw'), { statusCode: 400 });
      }

      // Lock the draw
      await client.query(
        `UPDATE draws SET status = 'locked' WHERE id = $1`,
        [draw.id]
      );

      // Use pre-committed seed (stored at draw creation)
      const seed = draw.seed;

      // Verify commitment before reveal (provably fair)
      const computedHash = createCommitmentHash(seed);
      if (computedHash !== draw.commitment_hash) {
        throw Object.assign(
          new Error('Commitment verification failed - draw integrity compromised'),
          { statusCode: 500 }
        );
      }
      logger.info(`Draw execution: commitment verified for draw=${draw.id}`);

      // Fetch actual tickets ordered by position
      const ticketsResult = await client.query(
        `SELECT t.id, t.ticket_id, t.user_id, t.position, u.username, u.email
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         WHERE t.draw_id = $1
         ORDER BY t.position ASC`,
        [draw.id]
      );

      const tickets = ticketsResult.rows;
      if (tickets.length === 0) {
        throw Object.assign(new Error('No tickets found for this draw'), { statusCode: 400 });
      }

      // Determine winner by index into actual tickets array (0-based)
      const winningIndex = determineWinner(seed, tickets.length);
      const winningTicket = tickets[winningIndex];
      const winningPosition = winningTicket.position;

      logger.info(`Draw winner: position=${winningPosition}, index=${winningIndex}, totalTickets=${tickets.length}`);

      // Update draw with results
      await client.query(
        `UPDATE draws 
         SET seed = $1, 
             winning_position = $2, 
             status = 'drawn',
             drawn_at = NOW()
         WHERE id = $3`,
        [seed, winningPosition, draw.id]
      );

      // Mark winning ticket
      await client.query(
        `UPDATE tickets 
         SET status = 'won', prize_amount = (SELECT prize_pool FROM draws WHERE id = $1)
         WHERE draw_id = $1 AND position = $2`,
        [draw.id, winningPosition]
      );

      const winner = winningTicket;

      // Get prize pool and apply 1% admin fee (winner gets 99%)
      const prizeResult = await client.query(
        'SELECT prize_pool FROM draws WHERE id = $1',
        [draw.id]
      );
      const prizePool = parseFloat(prizeResult.rows[0].prize_pool);
      const adminFee = Math.floor(prizePool * 0.01 * 100) / 100;
      const winnerAmount = Math.round((prizePool - adminFee) * 100) / 100;

      // Update winning ticket with actual prize amount (99%)
      await client.query(
        `UPDATE tickets SET status = 'won', prize_amount = $1
         WHERE draw_id = $2 AND position = $3`,
        [winnerAmount, draw.id, winningPosition]
      );

      // Mark non-winning tickets as 'lost'
      await client.query(
        `UPDATE tickets SET status = 'lost' WHERE draw_id = $1 AND position != $2`,
        [draw.id, winningPosition]
      );

      // Credit winner (99%)
      await client.query(
        `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
        [winnerAmount, winner.user_id]
      );

      // Record winner transaction
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, metadata)
         VALUES ($1, 'prize_win', $2, 'completed', $3)`,
        [
          winner.user_id,
          winnerAmount,
          JSON.stringify({ reason: 'prize_win', draw_id: draw.id, ticket_id: winner.id }),
        ]
      );

      // Credit admin (1%) - get admin user by email
      const adminResult = await client.query(
        `SELECT u.id, w.id as wallet_id FROM users u
         JOIN wallets w ON w.user_id = u.id
         WHERE u.email = 'admin@dailydollar.com'`
      );

      if (adminResult.rows.length > 0 && adminFee > 0) {
        await client.query(
          `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
          [adminFee, adminResult.rows[0].id]
        );
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, metadata)
           VALUES ($1, 'deposit', $2, 'completed', $3)`,
          [
            adminResult.rows[0].id,
            adminFee,
            JSON.stringify({ reason: 'admin_fee', draw_id: draw.id }),
          ]
        );
      }

      return {
        drawId: draw.id,
        winningPosition,
        winner,
        prizeAmount: winnerAmount,
        adminFee,
        totalPool: prizePool,
        seed,
      };
    });

    logger.info(`Draw executed: draw=${result.drawId}, winner=${result.winner.username}`);

    // Send winner notification email
    const drawDateForEmail = (await query('SELECT draw_date FROM draws WHERE id = $1', [result.drawId])).rows[0]?.draw_date;
    const drawDateStr = drawDateForEmail ? new Date(drawDateForEmail).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    emailService.sendWinnerNotification(
      result.winner.email,
      result.winner.username,
      result.winner.ticket_id || result.winner.id,
      String(result.prizeAmount),
      drawDateStr
    ).catch(err => logger.warn('Winner email failed:', err));

    // Send draw results to non-winners (participants)
    const participantsResult = await query(
      `SELECT t.user_id, u.email, u.username, t.ticket_id
       FROM tickets t JOIN users u ON u.id = t.user_id
       WHERE t.draw_id = $1 AND t.user_id != $2`,
      [result.drawId, result.winner.user_id]
    );
    for (const p of participantsResult.rows) {
      if (p.email) {
        emailService.sendDrawResults(
          p.email,
          p.username,
          p.ticket_id || p.user_id,
          drawDateStr,
          result.winner.ticket_id || result.winner.id,
          String(result.prizeAmount)
        ).catch(err => logger.warn('Draw results email failed:', err));
      }
    }

    broadcastDrawResult(result.drawId, {
      winning_position: result.winningPosition,
      prize_pool: result.prizeAmount,
      winner_username: result.winner.username,
    });

    res.json({
      message: 'Draw executed successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/draws/create-next
 * Create next day's draw (admin/cron job)
 */
router.post('/create-next', cronOrAuth, async (req, res, next) => {
  try {
    // Bootstrap: ensure today's draw has seed if open and missing (from initial migration)
    const todayDraw = await query(
      `SELECT id FROM draws WHERE draw_date = CURRENT_DATE AND status = 'open' AND seed IS NULL LIMIT 1`
    );
    if (todayDraw.rows.length > 0) {
      const bootSeed = generateDrawSeed();
      const bootHash = createCommitmentHash(bootSeed);
      await query(
        `UPDATE draws SET commitment_hash = $1, seed = $2 WHERE id = $3`,
        [bootHash, bootSeed, todayDraw.rows[0].id]
      );
      logger.info(`Backfilled today's draw with provably fair seed`);
    }

    const seed = generateDrawSeed();
    const commitmentHash = createCommitmentHash(seed);

    const result = await query(
      `INSERT INTO draws (draw_date, commitment_hash, seed, status)
       VALUES (CURRENT_DATE + INTERVAL '1 day', $1, $2, 'open')
       ON CONFLICT (draw_date) DO NOTHING
       RETURNING id, draw_date, commitment_hash`,
      [commitmentHash, seed]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Draw for next day already exists' });
    }

    logger.info(`New draw created: ${result.rows[0].id}`);

    res.status(201).json({
      message: 'Next draw created',
      draw: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;

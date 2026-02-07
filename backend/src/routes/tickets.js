import express from 'express';
import { body, param } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { sealTicket } from '../utils/crypto.js';
import { broadcastPrizePoolUpdate } from '../websocket/index.js';
import { checkSelfExclusion, checkSpendingLimits } from '../middleware/responsiblePlay.js';
import { emailService } from '../utils/email.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/tickets/purchase
 * Purchase a ticket for today's draw
 */
router.post(
  '/purchase',
  [
    body('drawId').isUUID(),
  ],
  handleValidationErrors,
  checkSelfExclusion,
  checkSpendingLimits,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { drawId } = req.body;
      const ticketPrice = 1.00; // $1 per ticket

      const result = await transaction(async (client) => {
        // 1. Check if draw exists and is open
        const drawResult = await client.query(
          'SELECT id, status, prize_pool, total_entries FROM draws WHERE id = $1 FOR UPDATE',
          [drawId]
        );

        if (drawResult.rows.length === 0) {
          throw Object.assign(new Error('Draw not found'), { statusCode: 404 });
        }

        const draw = drawResult.rows[0];

        if (draw.status !== 'open') {
          throw Object.assign(new Error('Draw is not open for entries'), { statusCode: 400 });
        }

        // 2. Enforce max 1 ticket per user per draw
        const existingCount = await client.query(
          'SELECT COUNT(*)::int as count FROM tickets WHERE user_id = $1 AND draw_id = $2',
          [userId, drawId]
        );
        if (existingCount.rows[0].count >= 1) {
          throw Object.assign(new Error('Max 1 ticket per draw per user'), { statusCode: 400 });
        }

        // 3. Check user's wallet balance
        const walletResult = await client.query(
          'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (walletResult.rows.length === 0) {
          throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
        }

        const wallet = walletResult.rows[0];

        if (wallet.balance < ticketPrice) {
          throw Object.assign(new Error('Insufficient balance'), { statusCode: 400 });
        }

        // 4. Deduct from wallet
        await client.query(
          'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
          [ticketPrice, wallet.id]
        );

        // 5. Create transaction record
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, metadata)
           VALUES ($1, 'ticket_purchase', $2, 'completed', $3)`,
          [userId, ticketPrice, JSON.stringify({ reason: 'ticket_purchase', draw_id: drawId })]
        );

        // 6. Generate ticket ID and cryptographic seal
        const ticketId = `TKT${Date.now()}${Math.floor(Math.random() * 10000)}`;
        const tempSeal = sealTicket({
          ticketId: ticketId,
          userId: userId,
          drawId: drawId,
          purchasedAt: new Date().toISOString(),
        });

        // 7. Create ticket with seal
        const ticketResult = await client.query(
          `INSERT INTO tickets (ticket_id, user_id, draw_id, position, total_entries_at_purchase, ticket_hash, created_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'active')
           RETURNING id, ticket_id, user_id, draw_id, position, ticket_hash, created_at`,
          [ticketId, userId, drawId, draw.total_entries, draw.total_entries + 1, tempSeal]
        );

        const ticket = ticketResult.rows[0];

        // 8. Update draw prize pool and entry count
        await client.query(
          `UPDATE draws 
           SET prize_pool = prize_pool + $1, 
               total_entries = total_entries + 1
           WHERE id = $2`,
          [ticketPrice, drawId]
        );

        // Get updated draw info
        const updatedDrawResult = await client.query(
          'SELECT prize_pool, total_entries FROM draws WHERE id = $1',
          [drawId]
        );

        return {
          ticket: {
            ...ticket,
            seal: ticket.ticket_hash,
          },
          draw: updatedDrawResult.rows[0],
          newBalance: wallet.balance - ticketPrice,
        };
      });

      logger.info(`Ticket purchased: user=${userId}, draw=${drawId}`);

      // Send purchase confirmation email (fire-and-forget)
      if (req.user.email) {
        const drawDateResult = await query('SELECT draw_date FROM draws WHERE id = $1', [drawId]);
        const drawDate = drawDateResult.rows[0]?.draw_date || new Date().toISOString().split('T')[0];
        emailService.sendPurchaseConfirmation(
          req.user.email,
          req.user.username,
          result.ticket.ticket_id || result.ticket.id,
          drawDate,
          parseFloat(result.draw.prize_pool)
        ).catch(err => logger.warn('Purchase confirmation email failed:', err));
      }

      // Broadcast prize pool update via WebSocket
      broadcastPrizePoolUpdate(drawId, result.draw.prize_pool, result.draw.total_entries);

      res.status(201).json({
        message: 'Ticket purchased successfully',
        ticket: result.ticket,
        prizePool: result.draw.prize_pool,
        totalEntries: result.draw.total_entries,
        newBalance: result.newBalance,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tickets/my-tickets
 * Get current user's tickets
 */
router.get('/my-tickets', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { drawId } = req.query;

    let queryText = `
      SELECT t.id, t.ticket_id, t.draw_id, t.position, t.total_entries_at_purchase, t.created_at as purchased_at, t.ticket_hash as seal, t.status,
             (CASE WHEN t.status = 'won' AND d.status = 'drawn'
                   THEN COALESCE(t.prize_amount, ROUND((d.prize_pool * 0.99)::numeric, 2))
                   ELSE t.prize_amount END) as prize_amount,
             d.draw_date, d.prize_pool, d.status as draw_status, d.winning_position
      FROM tickets t
      JOIN draws d ON t.draw_id = d.id
      WHERE t.user_id = $1
    `;

    const params = [userId];

    if (drawId) {
      queryText += ' AND t.draw_id = $2';
      params.push(drawId);
    }

    queryText += ' ORDER BY t.created_at DESC';

    const result = await query(queryText, params);

    res.json({
      tickets: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tickets/:ticketId
 * Get specific ticket details
 */
router.get(
  '/:ticketId',
  [
    param('ticketId').isUUID(),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { ticketId } = req.params;

      const result = await query(
        `SELECT t.*, t.created_at as purchased_at, t.ticket_hash as seal,
                d.draw_date, d.prize_pool, d.status as draw_status, d.winning_position, d.seed
         FROM tickets t
         JOIN draws d ON t.draw_id = d.id
         WHERE t.id = $1 AND t.user_id = $2`,
        [ticketId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      res.json({
        ticket: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

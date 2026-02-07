import express from 'express';
import { body } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { checkSelfExclusion, checkSpendingLimits } from '../middleware/responsiblePlay.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/wallet
 * Get user's wallet balance and info
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, balance, pending_balance, created_at, updated_at
       FROM wallets
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      wallet: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/wallet/transactions
 * Get user's transaction history
 */
router.get('/transactions', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Get transactions (using user_id directly)
    const result = await query(
      `SELECT id, type, amount, status, metadata, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = $1',
      [userId]
    );

    res.json({
      transactions: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/wallet/deposit
 * Add funds to wallet (via RevenueCat webhook or manual)
 * In production, this would be triggered by RevenueCat webhook
 */
router.post(
  '/deposit',
  [
    body('amount').isFloat({ min: 0.01 }),
    body('source').isIn(['revenuecat', 'manual', 'admin']),
    body('referenceId').optional().isString(),
  ],
  handleValidationErrors,
  idempotencyMiddleware(),
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { amount, source, referenceId } = req.body;

      const result = await transaction(async (client) => {
        // Get wallet
        const walletResult = await client.query(
          'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (walletResult.rows.length === 0) {
          throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
        }

        const wallet = walletResult.rows[0];

        // Add to balance
        await client.query(
          'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
          [amount, wallet.id]
        );

        // Create transaction record
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, metadata)
           VALUES ($1, 'deposit', $2, 'completed', $3)`,
          [
            userId,
            amount,
            JSON.stringify({ source, reference_id: referenceId }),
          ]
        );

        return {
          newBalance: parseFloat(wallet.balance) + parseFloat(amount),
        };
      });

      logger.info(`Deposit processed: user=${userId}, amount=${amount}`);

      res.json({
        message: 'Deposit successful',
        balance: result.newBalance,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/wallet/withdraw
 * Request withdrawal (requires minimum balance)
 */
router.post(
  '/withdraw',
  [
    body('amount').isFloat({ min: 10.00 }), // Minimum $10 withdrawal
    body('method').isIn(['paypal', 'stripe']),
    body('accountDetails').isObject(),
  ],
  handleValidationErrors,
  checkSelfExclusion,
  checkSpendingLimits,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { amount, method, accountDetails } = req.body;

      const result = await transaction(async (client) => {
        // Get wallet
        const walletResult = await client.query(
          'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
          [userId]
        );

        if (walletResult.rows.length === 0) {
          throw Object.assign(new Error('Wallet not found'), { statusCode: 404 });
        }

        const wallet = walletResult.rows[0];

        if (wallet.balance < amount) {
          throw Object.assign(new Error('Insufficient balance'), { statusCode: 400 });
        }

        // Move to pending balance
        await client.query(
          `UPDATE wallets 
           SET balance = balance - $1, 
               pending_balance = pending_balance + $1
           WHERE id = $2`,
          [amount, wallet.id]
        );

        // Create pending transaction
        const txResult = await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, metadata)
           VALUES ($1, 'withdrawal', $2, 'pending', $3)
           RETURNING id`,
          [
            userId,
            amount,
            JSON.stringify({ 
              method, 
              account_details: accountDetails,
              requested_at: new Date().toISOString(),
            }),
          ]
        );

        return {
          transactionId: txResult.rows[0].id,
          newBalance: parseFloat(wallet.balance) - parseFloat(amount),
        };
      });

      logger.info(`Withdrawal requested: user=${userId}, amount=${amount}`);

      // TODO: Process withdrawal via Stripe/PayPal API

      res.json({
        message: 'Withdrawal request submitted',
        transactionId: result.transactionId,
        balance: result.newBalance,
        status: 'pending',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

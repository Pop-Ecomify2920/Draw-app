import express from 'express';
import { body } from 'express-validator';
import { query, transaction } from '../config/database.js';
import { handleValidationErrors } from '../middleware/validation.js';
import logger from '../config/logger.js';

const router = express.Router();

// No auth - webhook uses signature/secret validation
// In production: verify RevenueCat webhook signature

/**
 * POST /api/webhooks/revenuecat
 * RevenueCat purchase webhook - credits user wallet
 * Body: { appUserId, amount, transactionId, productId }
 * Uses transactionId as idempotency - checks before crediting
 */
router.post(
  '/revenuecat',
  [
    body('appUserId').isUUID(),
    body('amount').isFloat({ min: 0.01 }),
    body('transactionId').isString(),
    body('productId').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { appUserId, amount, transactionId } = req.body;

      // Idempotency: check if we already processed this transaction
      const existing = await query(
        `SELECT 1 FROM transactions 
         WHERE metadata->>'reference_id' = $1 AND type = 'deposit'`,
        [transactionId]
      );
      if (existing.rows.length > 0) {
        logger.info(`Webhook idempotency: already processed ${transactionId}`);
        return res.status(200).json({ message: 'Already processed', status: 'duplicate' });
      }

      const result = await transaction(async (client) => {
        const walletResult = await client.query(
          'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
          [appUserId]
        );
        if (walletResult.rows.length === 0) {
          throw Object.assign(new Error('User wallet not found'), { statusCode: 404 });
        }
        const wallet = walletResult.rows[0];

        await client.query(
          'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
          [amount, wallet.id]
        );

        await client.query(
          `INSERT INTO transactions (user_id, type, amount, status, metadata)
           VALUES ($1, 'deposit', $2, 'completed', $3)`,
          [
            appUserId,
            amount,
            JSON.stringify({ source: 'revenuecat', reference_id: transactionId }),
          ]
        );

        return { newBalance: parseFloat(wallet.balance) + parseFloat(amount) };
      });

      logger.info(`Webhook deposit: user=${appUserId}, amount=${amount}`);
      res.status(200).json({ message: 'OK', balance: result.newBalance });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

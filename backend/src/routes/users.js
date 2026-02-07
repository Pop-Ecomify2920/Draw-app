import express from 'express';
import { body } from 'express-validator';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import logger from '../config/logger.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/users/me
 * Get current user profile including responsible play settings
 */
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, email, username, created_at, is_active, email_verified,
              self_excluded_until, spending_limit_daily, spending_limit_monthly,
              COALESCE(is_admin, false) as is_admin
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get wallet balance
    const walletResult = await query(
      'SELECT balance, pending_balance FROM wallets WHERE user_id = $1',
      [userId]
    );
    user.balance = walletResult.rows[0]?.balance ?? 0;
    user.pending_balance = walletResult.rows[0]?.pending_balance ?? 0;

    // Fallback: designated admin email always gets admin access
    const isAdmin = !!user.is_admin || user.email === 'ollie.bryant08@icloud.com';

    const payload = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        balance: parseFloat(user.balance),
        pendingBalance: parseFloat(user.pending_balance),
        selfExcludedUntil: user.self_excluded_until,
        spendingLimitDaily: user.spending_limit_daily ? parseFloat(user.spending_limit_daily) : null,
        spendingLimitMonthly: user.spending_limit_monthly ? parseFloat(user.spending_limit_monthly) : null,
        isAdmin,
      },
    };

    // Include admin stats when user is admin (embedded in /me to avoid routing issues)
    if (isAdmin) {
      try {
        const [uc, dep, wd, tk, dr, lb, rev] = await Promise.all([
          query('SELECT COUNT(*)::int as total FROM users WHERE COALESCE(is_admin, false) = false'),
          query(`SELECT COALESCE(SUM(amount), 0)::float as total, COUNT(*)::int as count FROM transactions WHERE type = 'deposit' AND status = 'completed'`),
          query(`SELECT COALESCE(SUM(amount), 0)::float as total, COUNT(*)::int as count FROM transactions WHERE type = 'withdrawal' AND status IN ('completed', 'pending')`),
          query(`SELECT COALESCE(SUM(amount), 0)::float as total_revenue, COUNT(*)::int as count FROM transactions WHERE type = 'ticket_purchase' AND status = 'completed'`),
          query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'drawn')::int as completed, COUNT(*) FILTER (WHERE status = 'open')::int as open FROM draws`),
          query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status = 'drawn')::int as completed FROM lobbies`),
          query(`SELECT type, COALESCE(SUM(amount), 0)::float as total, COUNT(*)::int as count FROM transactions WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY type`),
        ]);
        const td = parseFloat(dep.rows[0]?.total ?? 0);
        const tw = parseFloat(wd.rows[0]?.total ?? 0);
        const ttr = parseFloat(tk.rows[0]?.total_revenue ?? 0);
        payload.adminStats = {
          overview: { totalUsers: uc.rows[0]?.total ?? 0, totalDeposits: td, totalWithdrawals: tw, totalTicketPurchases: tk.rows[0]?.count ?? 0, totalTicketRevenue: ttr, netRevenue: td - tw },
          deposits: { total: td, count: dep.rows[0]?.count ?? 0 },
          withdrawals: { total: tw, count: wd.rows[0]?.count ?? 0 },
          draws: dr.rows[0] || {},
          lobbies: lb.rows[0] || {},
          last30DaysByType: rev.rows || [],
        };
      } catch (e) {
        logger.error('Admin stats fetch error:', e);
      }
    }

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/me
 * Update profile / responsible play settings
 */
router.patch(
  '/me',
  [
    body('selfExcludedUntil').optional().isISO8601().toDate(),
    body('spendingLimitDaily').optional().isFloat({ min: 0 }),
    body('spendingLimitMonthly').optional().isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { selfExcludedUntil, spendingLimitDaily, spendingLimitMonthly } = req.body;

      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (selfExcludedUntil !== undefined) {
        updates.push(`self_excluded_until = $${paramIndex++}`);
        values.push(selfExcludedUntil);
      }
      if (spendingLimitDaily !== undefined) {
        updates.push(`spending_limit_daily = $${paramIndex++}`);
        values.push(spendingLimitDaily);
      }
      if (spendingLimitMonthly !== undefined) {
        updates.push(`spending_limit_monthly = $${paramIndex++}`);
        values.push(spendingLimitMonthly);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(userId);
      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      logger.info(`User updated responsible play settings: ${userId}`);

      // Return updated user
      const result = await query(
        `SELECT id, email, username, self_excluded_until, spending_limit_daily, spending_limit_monthly
         FROM users WHERE id = $1`,
        [userId]
      );

      const user = result.rows[0];
      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          selfExcludedUntil: user.self_excluded_until,
          spendingLimitDaily: user.spending_limit_daily ? parseFloat(user.spending_limit_daily) : null,
          spendingLimitMonthly: user.spending_limit_monthly ? parseFloat(user.spending_limit_monthly) : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

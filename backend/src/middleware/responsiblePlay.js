import { query } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Check if user is self-excluded
 */
export async function checkSelfExclusion(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return next();

    const result = await query(
      'SELECT self_excluded_until FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) return next();

    const until = result.rows[0].self_excluded_until;
    if (until && new Date(until) > new Date()) {
      logger.warn(`Self-excluded user attempted action: ${userId}`);
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account is self-excluded until ' + new Date(until).toISOString(),
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check spending limits before purchase/withdrawal
 */
export async function checkSpendingLimits(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return next();

    let amount = parseFloat(req.body?.amount) || 0;
    if (amount <= 0 && req.path?.includes('purchase')) {
      amount = 1.00; // Ticket purchase is always $1
    }
    if (amount <= 0) return next();

    const result = await query(
      `SELECT spending_limit_daily, spending_limit_monthly 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return next();

    const { spending_limit_daily, spending_limit_monthly } = result.rows[0];
    if (!spending_limit_daily && !spending_limit_monthly) return next();

    // Sum spending for today (ticket_purchase, withdrawals count as spending)
    const dailyResult = await query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM transactions 
       WHERE user_id = $1 
         AND type IN ('ticket_purchase', 'withdrawal')
         AND created_at >= CURRENT_DATE`,
      [userId]
    );

    const monthlyResult = await query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total
       FROM transactions 
       WHERE user_id = $1 
         AND type IN ('ticket_purchase', 'withdrawal')
         AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [userId]
    );

    const dailySpent = parseFloat(dailyResult.rows[0].total);
    const monthlySpent = parseFloat(monthlyResult.rows[0].total);

    if (spending_limit_daily && dailySpent + amount > parseFloat(spending_limit_daily)) {
      return res.status(403).json({
        error: 'Spending limit exceeded',
        message: `Daily spending limit ($${spending_limit_daily}) would be exceeded`,
      });
    }

    if (spending_limit_monthly && monthlySpent + amount > parseFloat(spending_limit_monthly)) {
      return res.status(403).json({
        error: 'Spending limit exceeded',
        message: `Monthly spending limit ($${spending_limit_monthly}) would be exceeded`,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Payment statistics and platform overview
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      userCount,
      depositStats,
      withdrawalStats,
      ticketStats,
      drawStats,
      lobbyStats,
      recentRevenue,
    ] = await Promise.all([
      query('SELECT COUNT(*)::int as total FROM users WHERE is_admin = false'),
      query(`
        SELECT COALESCE(SUM(amount), 0)::float as total, COUNT(*)::int as count
        FROM transactions WHERE type = 'deposit' AND status = 'completed'
      `),
      query(`
        SELECT COALESCE(SUM(amount), 0)::float as total, COUNT(*)::int as count
        FROM transactions WHERE type = 'withdrawal' AND status IN ('completed', 'pending')
      `),
      query(`
        SELECT COALESCE(SUM(amount), 0)::float as total_revenue, COUNT(*)::int as count
        FROM transactions WHERE type = 'ticket_purchase' AND status = 'completed'
      `),
      query(`
        SELECT COUNT(*)::int as total,
               COUNT(*) FILTER (WHERE status = 'drawn')::int as completed,
               COUNT(*) FILTER (WHERE status = 'open')::int as open
        FROM draws
      `),
      query(`
        SELECT COUNT(*)::int as total,
               COUNT(*) FILTER (WHERE status = 'drawn')::int as completed
        FROM lobbies
      `),
      query(`
        SELECT type, COALESCE(SUM(amount), 0)::float as total, COUNT(*)::int as count
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY type
      `),
    ]);

    const totalDeposits = parseFloat(depositStats.rows[0]?.total ?? 0);
    const totalWithdrawals = parseFloat(withdrawalStats.rows[0]?.total ?? 0);
    const totalTicketRevenue = parseFloat(ticketStats.rows[0]?.total_revenue ?? 0);

    res.json({
      overview: {
        totalUsers: userCount.rows[0]?.total ?? 0,
        totalDeposits,
        totalWithdrawals,
        totalTicketPurchases: ticketStats.rows[0]?.count ?? 0,
        totalTicketRevenue,
        netRevenue: totalDeposits - totalWithdrawals,
      },
      deposits: {
        total: totalDeposits,
        count: depositStats.rows[0]?.count ?? 0,
      },
      withdrawals: {
        total: totalWithdrawals,
        count: withdrawalStats.rows[0]?.count ?? 0,
      },
      draws: drawStats.rows[0] || {},
      lobbies: lobbyStats.rows[0] || {},
      last30DaysByType: recentRevenue.rows,
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    next(error);
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/users', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;
    const params = [parseInt(limit), parseInt(offset)];
    let where = '';

    if (search) {
      params.push(`%${search}%`);
      where = `WHERE (email ILIKE $3 OR username ILIKE $3)`;
    }

    const baseParams = search ? [params[0], params[1], params[2]] : [params[0], params[1]];
    const countParams = search ? [params[2]] : [];

    const [usersResult, countResult] = await Promise.all([
      query(
        `SELECT u.id, u.email, u.username, u.created_at, u.is_active, COALESCE(u.is_admin, false) as is_admin,
                COALESCE(w.balance, 0)::float as balance,
                COALESCE(w.pending_balance, 0)::float as pending_balance
         FROM users u
         LEFT JOIN wallets w ON w.user_id = u.id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        baseParams
      ),
      query(
        `SELECT COUNT(*)::int as total FROM users ${where}`,
        countParams
      ),
    ]);

    res.json({
      users: usersResult.rows.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        balance: parseFloat(user.balance),
        pendingBalance: parseFloat(user.pending_balance),
        isActive: user.is_active,
        emailVerified: user.email_verified || false,
        createdAt: user.created_at,
        selfExcludedUntil: user.self_excluded_until || null,
        spendingLimitDaily: user.spending_limit_daily || null,
        spendingLimitMonthly: user.spending_limit_monthly || null,
        isAdmin: user.is_admin || false,
      })),
      total: countResult.rows[0]?.total ?? 0,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('Admin users list error:', error);
    next(error);
  }
});

/**
 * GET /api/admin/transactions
 * List all transactions with filters
 */
router.get('/transactions', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0, type, status, userId } = req.query;
    const params = [parseInt(limit) || 100, parseInt(offset) || 0];
    const conditions = [];
    let paramIndex = 3;

    if (type) {
      conditions.push(`t.type = $${paramIndex++}`);
      params.push(type);
    }
    if (status) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(status);
    }
    if (userId) {
      conditions.push(`t.user_id = $${paramIndex++}`);
      params.push(userId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT t.id, t.user_id, t.type, t.amount, t.status, t.metadata, t.created_at,
              u.email, u.username
       FROM transactions t
       LEFT JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*)::int as total FROM transactions t ${where}`,
      params.slice(2)
    );

    res.json({
      transactions: result.rows.map(tx => ({
        id: tx.id,
        userId: tx.user_id,
        username: tx.username || 'Unknown',
        type: tx.type,
        amount: parseFloat(tx.amount),
        status: tx.status,
        createdAt: tx.created_at,
        metadata: tx.metadata,
      })),
      total: countResult.rows[0]?.total ?? 0,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('Admin transactions error:', error);
    next(error);
  }
});

/**
 * GET /api/admin/draws
 * List all draws
 */
router.get('/draws', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const params = [parseInt(limit), parseInt(offset)];
    let where = '';
    if (status) {
      params.push(status);
      where = 'WHERE d.status = $3';
    }

    const result = await query(
      `SELECT d.id, d.draw_date, d.prize_pool, d.total_entries, d.status,
              d.winning_position, d.drawn_at, d.created_at,
              u.username as winner_username, t.user_id as winner_id
       FROM draws d
       LEFT JOIN tickets t ON t.draw_id = d.id AND t.status = 'won'
       LEFT JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY d.draw_date DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*)::int as total FROM draws ${where}`,
      where ? [params[2]] : []
    );

    res.json({
      draws: result.rows.map(row => ({
        id: row.id,
        drawDate: row.draw_date,
        prizePool: parseFloat(row.prize_pool),
        status: row.status,
        winnerId: row.winner_id,
        winnerUsername: row.winner_username,
        ticketCount: row.total_entries || 0,
        serverSeed: null,
        drawnAt: row.drawn_at,
      })),
      total: countResult.rows[0]?.total ?? 0,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('Admin draws error:', error);
    next(error);
  }
});

/**
 * GET /api/admin/lobbies
 * List all lobbies
 */
router.get('/lobbies', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? 'WHERE l.status = $1' : '';
    const queryParams = status ? [status] : [];

    const result = await query(
      `SELECT l.id, l.code, l.name, l.prize_pool, l.status, l.created_at, l.host_id,
              u.username as host_username,
              (SELECT COUNT(*) FROM lobby_members WHERE lobby_id = l.id)::int as member_count
       FROM lobbies l
       JOIN users u ON u.id = l.host_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT 100`,
      queryParams
    );
    const countResult = await query(
      `SELECT COUNT(*)::int as total FROM lobbies l ${where}`,
      queryParams
    );

    res.json({
      lobbies: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        hostId: row.host_id,
        hostUsername: row.host_username,
        prizePool: parseFloat(row.prize_pool),
        status: row.status,
        createdAt: row.created_at,
        memberCount: row.member_count || 0,
      })),
      total: countResult.rows[0]?.total ?? 0,
      page: 1,
      limit: 100,
    });
  } catch (error) {
    logger.error('Admin lobbies error:', error);
    next(error);
  }
});

/**
 * GET /api/admin/payment-summary
 * Detailed payment statistics for reports
 */
router.get('/payment-summary', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let dateFilter = '';
    const params = [];
    if (from) {
      params.push(from);
      dateFilter += (dateFilter ? ' AND ' : ' WHERE ') + `created_at >= $${params.length}::date`;
    }
    if (to) {
      params.push(to);
      dateFilter += (dateFilter ? ' AND ' : ' WHERE ') + `created_at <= $${params.length}::date`;
    }

    const result = await query(
      `SELECT type, status,
              COUNT(*)::int as count,
              COALESCE(SUM(amount), 0)::float as total
       FROM transactions
       ${dateFilter}
       GROUP BY type, status
       ORDER BY type, status`,
      params
    );

    res.json({
      summary: result.rows,
      dateRange: { from: from || null, to: to || null },
    });
  } catch (error) {
    logger.error('Admin payment summary error:', error);
    next(error);
  }
});

/**
 * GET /api/admin/users/:userId
 * Get user details with transaction history
 */
router.get('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [userResult, transactionsResult] = await Promise.all([
      query(
        `SELECT u.id, u.email, u.username, u.created_at, u.is_active, u.email_verified,
                COALESCE(u.is_admin, false) as is_admin,
                COALESCE(w.balance, 0)::float as balance,
                COALESCE(w.pending_balance, 0)::float as pending_balance
         FROM users u
         LEFT JOIN wallets w ON w.user_id = u.id
         WHERE u.id = $1`,
        [userId]
      ),
      query(
        `SELECT t.id, t.type, t.amount, t.status, t.created_at, t.metadata
         FROM transactions t
         WHERE t.user_id = $1
         ORDER BY t.created_at DESC
         LIMIT 50`,
        [userId]
      ),
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        balance: parseFloat(user.balance),
        pendingBalance: parseFloat(user.pending_balance),
        isActive: user.is_active,
        emailVerified: user.email_verified || false,
        createdAt: user.created_at,
        selfExcludedUntil: user.self_excluded_until || null,
        spendingLimitDaily: user.spending_limit_daily || null,
        spendingLimitMonthly: user.spending_limit_monthly || null,
        isAdmin: user.is_admin || false,
      },
      transactions: transactionsResult.rows.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        status: tx.status,
        createdAt: tx.created_at,
        metadata: tx.metadata,
      })),
    });
  } catch (error) {
    logger.error('Admin user detail error:', error);
    next(error);
  }
});

/**
 * POST /api/admin/users/:userId/suspend
 * Suspend user account
 */
router.post('/users/:userId/suspend', async (req, res, next) => {
  try {
    const { userId } = req.params;

    await query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [userId]
    );

    logger.info(`Admin ${req.user.email} suspended user ${userId}`);
    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    logger.error('Admin suspend user error:', error);
    next(error);
  }
});

/**
 * POST /api/admin/users/:userId/reactivate
 * Reactivate suspended user account
 */
router.post('/users/:userId/reactivate', async (req, res, next) => {
  try {
    const { userId } = req.params;

    await query(
      'UPDATE users SET is_active = true WHERE id = $1',
      [userId]
    );

    logger.info(`Admin ${req.user.email} reactivated user ${userId}`);
    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    logger.error('Admin reactivate user error:', error);
    next(error);
  }
});

/**
 * POST /api/admin/users/:userId/balance
 * Adjust user balance (credit/debit)
 */
router.post('/users/:userId/balance', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const parsedAmount = parseFloat(amount);

    // Begin transaction
    const client = await query('BEGIN');

    try {
      // Create transaction record
      const txResult = await query(
        `INSERT INTO transactions (user_id, type, amount, status, metadata)
         VALUES ($1, $2, $3, 'completed', $4)
         RETURNING id, type, amount, status, created_at`,
        [
          userId,
          parsedAmount > 0 ? 'deposit' : 'withdrawal',
          Math.abs(parsedAmount),
          JSON.stringify({ admin_adjustment: true, reason, admin_id: req.user.id }),
        ]
      );

      // Update wallet balance
      await query(
        `UPDATE wallets
         SET balance = balance + $1
         WHERE user_id = $2`,
        [parsedAmount, userId]
      );

      // Get updated balance
      const walletResult = await query(
        'SELECT balance FROM wallets WHERE user_id = $1',
        [userId]
      );

      await query('COMMIT');

      logger.info(
        `Admin ${req.user.email} adjusted balance for user ${userId}: ${parsedAmount > 0 ? '+' : ''}${parsedAmount} (${reason})`
      );

      res.json({
        balance: parseFloat(walletResult.rows[0]?.balance ?? 0),
        transaction: txResult.rows[0],
      });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    logger.error('Admin balance adjustment error:', error);
    next(error);
  }
});

/**
 * POST /api/admin/draws/:drawId/trigger
 * Manually trigger a draw
 */
router.post('/draws/:drawId/trigger', async (req, res, next) => {
  try {
    const { drawId } = req.params;

    // Import the draw settlement logic
    const crypto = await import('crypto');

    // Begin transaction
    await query('BEGIN');

    try {
      // Get draw info
      const drawResult = await query(
        'SELECT id, draw_date, status, prize_pool, total_entries FROM draws WHERE id = $1',
        [drawId]
      );

      if (drawResult.rows.length === 0) {
        return res.status(404).json({ error: 'Draw not found' });
      }

      const draw = drawResult.rows[0];

      if (draw.status !== 'open') {
        return res.status(400).json({ error: 'Draw is not open' });
      }

      if (draw.total_entries === 0) {
        return res.status(400).json({ error: 'No tickets in this draw' });
      }

      // Generate random seed
      const serverSeed = crypto.randomBytes(32).toString('hex');
      const seedInt = parseInt(serverSeed.slice(0, 15), 16);
      const winningPosition = (seedInt % draw.total_entries) + 1;

      // Get all tickets for this draw
      const ticketsResult = await query(
        `SELECT id, user_id, position FROM tickets
         WHERE draw_id = $1
         ORDER BY position`,
        [drawId]
      );

      // Find winner
      const winnerTicket = ticketsResult.rows.find(t => t.position === winningPosition);

      if (!winnerTicket) {
        throw new Error('Could not determine winner');
      }

      // Calculate prize (99% to winner, 1% fee)
      const adminFee = Math.floor(parseFloat(draw.prize_pool) * 0.01 * 100) / 100;
      const prizeAmount = parseFloat(draw.prize_pool) - adminFee;

      // Update draw
      await query(
        `UPDATE draws
         SET status = 'drawn', winning_position = $1, drawn_at = NOW()
         WHERE id = $2`,
        [winningPosition, drawId]
      );

      // Update winning ticket
      await query(
        'UPDATE tickets SET status = $1, prize_amount = $2 WHERE id = $3',
        ['won', prizeAmount, winnerTicket.id]
      );

      // Update losing tickets
      await query(
        'UPDATE tickets SET status = $1 WHERE draw_id = $2 AND id != $3',
        ['lost', drawId, winnerTicket.id]
      );

      // Credit winner's wallet
      await query(
        'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
        [prizeAmount, winnerTicket.user_id]
      );

      // Record prize transaction
      await query(
        `INSERT INTO transactions (user_id, type, amount, status, metadata)
         VALUES ($1, 'prize_win', $2, 'completed', $3)`,
        [
          winnerTicket.user_id,
          prizeAmount,
          JSON.stringify({ draw_id: drawId, winning_position: winningPosition }),
        ]
      );

      await query('COMMIT');

      // Get winner username
      const userResult = await query(
        'SELECT username FROM users WHERE id = $1',
        [winnerTicket.user_id]
      );

      logger.info(`Admin ${req.user.email} triggered draw ${drawId}, winner: ${winnerTicket.user_id}`);

      res.json({
        draw: {
          id: draw.id,
          drawDate: draw.draw_date,
          prizePool: parseFloat(draw.prize_pool),
          status: 'drawn',
          winnerId: winnerTicket.user_id,
          winnerUsername: userResult.rows[0]?.username,
          ticketCount: draw.total_entries,
          serverSeed,
          drawnAt: new Date().toISOString(),
        },
        winner: {
          ticketId: winnerTicket.id,
          userId: winnerTicket.user_id,
          username: userResult.rows[0]?.username,
          ticketHash: '',
          createdAt: new Date().toISOString(),
          isWinner: true,
        },
      });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    logger.error('Admin trigger draw error:', error);
    next(error);
  }
});

export default router;

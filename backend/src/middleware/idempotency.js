import { query } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Idempotency middleware - returns cached response if key seen before
 * Use X-Idempotency-Key header
 */
export function idempotencyMiddleware() {
  return async (req, res, next) => {
    const key = req.headers['x-idempotency-key'];
    if (!key || key.length > 64) {
      return next();
    }

    const userId = req.user?.id;
    if (!userId) return next();

    const endpoint = req.method + ' ' + req.path;

    try {
      const existing = await query(
        'SELECT response_status, response_body FROM idempotency_keys WHERE key = $1',
        [key]
      );

      if (existing.rows.length > 0) {
        const { response_status, response_body } = existing.rows[0];
        logger.info(`Idempotency hit: key=${key}`);
        return res.status(response_status || 200).json(response_body || {});
      }

      const originalJson = res.json.bind(res);
      res.json = function (body) {
        query(
          `INSERT INTO idempotency_keys (key, user_id, endpoint, response_status, response_body)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (key) DO NOTHING`,
          [key, userId, endpoint, res.statusCode, JSON.stringify(body)]
        ).catch(err => logger.error('Idempotency store error:', err));
        return originalJson(body);
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

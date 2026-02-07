import cron from 'node-cron';
import logger from '../config/logger.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

/**
 * Call internal API to execute today's draw
 */
async function executeDraw() {
  try {
    const res = await fetch(`${API_URL}/api/draws/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': CRON_SECRET,
      },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      logger.info('Cron: Draw executed successfully');
    } else {
      const text = await res.text();
      logger.warn('Cron: Draw execute failed', { status: res.status, body: text });
    }
  } catch (err) {
    logger.error('Cron: Draw execute error', err);
  }
}

/**
 * Call internal API to create next day's draw
 */
async function createNextDraw() {
  try {
    const res = await fetch(`${API_URL}/api/draws/create-next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': CRON_SECRET,
      },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      logger.info('Cron: Next draw created successfully');
    } else {
      const text = await res.text();
      logger.warn('Cron: Create next draw failed', { status: res.status, body: text });
    }
  } catch (err) {
    logger.error('Cron: Create next draw error', err);
  }
}

/**
 * Midnight UTC job: execute today, create next
 */
async function midnightJob() {
  logger.info('Cron: Running midnight UTC job');
  await executeDraw();
  await createNextDraw();
}

/**
 * Start the scheduler (runs at 00:00 UTC daily)
 * Set CRON_ENABLED=false to disable
 */
export function startDrawScheduler() {
  if (process.env.CRON_ENABLED === 'false') {
    logger.info('Cron: Disabled (CRON_ENABLED=false)');
    return;
  }

  cron.schedule('0 0 * * *', midnightJob, {
    timezone: 'UTC',
  });

  logger.info('Cron: Draw scheduler started (midnight UTC)');
}

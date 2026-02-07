import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import pool from './config/database.js';
import logger from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initializeWebSocket } from './websocket/index.js';
import { startDrawScheduler } from './jobs/drawScheduler.js';

// Import routes
import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import walletRoutes from './routes/wallet.js';
import drawRoutes from './routes/draws.js';
import userRoutes from './routes/users.js';
import webhookRoutes from './routes/webhooks.js';
import lobbyRoutes from './routes/lobby.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(helmet()); // Security headers

// CORS configuration - Allow web app and mobile
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
  'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) || [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-cron-secret', 'x-idempotency-key'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later' },
});

app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// API Routes (admin first - more specific paths before parameterized routes)
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/draws', drawRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize WebSocket server
const io = initializeWebSocket(server);

// Start draw scheduler (midnight UTC)
startDrawScheduler();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database pool
    await pool.end();
    logger.info('Database pool closed');
    
    process.exit(0);
  });
});

// Start server
server.listen(PORT, HOST, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎰 Daily Dollar Lotto Backend Server                   ║
║                                                           ║
║   Status: Running                                         ║
║   Port: ${PORT}                                        ║
║   Host: ${HOST}                                    ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   Database: PostgreSQL                                    ║
║   WebSocket: Enabled                                      ║
║                                                           ║
║   Endpoints:                                              ║
║   - GET  /health                                          ║
║   - POST /api/auth/signup                                 ║
║   - POST /api/auth/signin                                 ║
║   - GET  /api/draws/today                                 ║
║   - POST /api/tickets/purchase                            ║
║   - GET  /api/wallet                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { app, io };

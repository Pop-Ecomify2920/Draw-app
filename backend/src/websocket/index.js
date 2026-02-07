import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

let io;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user info to socket
      socket.userId = decoded.userId;
      
      logger.info(`WebSocket client connected: user=${decoded.userId}`);
      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}, user: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join draw room (for real-time prize pool updates)
    socket.on('join:draw', (drawId) => {
      socket.join(`draw:${drawId}`);
      logger.info(`User ${socket.userId} joined draw room: ${drawId}`);
    });

    // Leave draw room
    socket.on('leave:draw', (drawId) => {
      socket.leave(`draw:${drawId}`);
      logger.info(`User ${socket.userId} left draw room: ${drawId}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}, user: ${socket.userId}`);
    });
  });

  return io;
}

/**
 * Broadcast prize pool update to all users watching a draw
 */
export function broadcastPrizePoolUpdate(drawId, prizePool, totalEntries) {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  io.to(`draw:${drawId}`).emit('draw:update', {
    drawId,
    prizePool,
    totalEntries,
    timestamp: new Date().toISOString(),
  });

  logger.info(`Broadcasted prize pool update: draw=${drawId}, pool=${prizePool}`);
}

/**
 * Broadcast draw result to all participants
 */
export function broadcastDrawResult(drawId, result) {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  io.to(`draw:${drawId}`).emit('draw:result', {
    drawId,
    winningPosition: result.winning_position,
    prizeAmount: result.prize_pool,
    timestamp: new Date().toISOString(),
  });

  logger.info(`Broadcasted draw result: draw=${drawId}`);
}

/**
 * Send personal notification to user
 */
export function sendUserNotification(userId, notification) {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString(),
  });

  logger.info(`Sent notification to user ${userId}: ${notification.type}`);
}

export default { initializeWebSocket, broadcastPrizePoolUpdate, broadcastDrawResult, sendUserNotification };

/**
 * @file src/config/socket.js
 * @description Socket.io server initialization and global io instance manager.
 */

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js';
import corsOptions from './cors.js';
import logger from './logger.js';
import { socketAuthMiddleware } from '../middlewares/socketAuth.middleware.js';
import { registerChatSocketHandlers } from '../modules/chat/chat.socket.js';

import env from './env.js';

let io = null;

export const initSocket = (httpServer) => {
  const subClient = redis.duplicate();

  io = new Server(httpServer, {
    cors: {
      origin: env.nodeEnv === 'production'
        ? env.clientUrl
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 20000,
    transports: ['websocket', 'polling']
  });

  io.adapter(createAdapter(redis, subClient));

  // Reject new connections during graceful shutdown
  io.use((socket, next) => {
    if (io.isShuttingDown) {
      return next(new Error('Server is shutting down'));
    }
    next();
  });

  // JWT Authentication middleware — validates every connection
  io.use(socketAuthMiddleware);

  // Register all chat event handlers
  registerChatSocketHandlers(io);

  logger.info('[Socket.io] Server initialized with Redis adapter + JWT auth + Chat handlers');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('[Socket.io] Not initialized. Call initSocket() first.');
  }
  return io;
};

export default { initSocket, getIO };

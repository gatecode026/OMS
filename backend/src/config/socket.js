/**
 * @file src/config/socket.js
 * @description Socket.io server initialization.
 *   Uses Redis pub/sub adapter when Redis is available.
 *   Falls back to the built-in in-memory adapter when Redis is unavailable
 *   (single-server dev mode — all chat features still work normally).
 */

import { Server } from 'socket.io';
import redis from './redis.js';
import corsOptions from './cors.js';
import logger from './logger.js';
import { socketAuthMiddleware } from '../middlewares/socketAuth.middleware.js';
import { registerChatSocketHandlers } from '../modules/chat/chat.socket.js';
import env from './env.js';
import { createAdapter } from '@socket.io/redis-adapter';

let io = null;

export const initSocket = async (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.nodeEnv === 'production'
        ? env.clientUrl
        : '*', // Allow all origins in development for local network devices
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 20000,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e9 // 1 GB (allows transferring large files/archives)
  });

  // ── Redis adapter (optional) ───────────────────────────────────────────────
  // Wait up to 3 s for Redis to become ready; if it's not available, proceed
  // with the default in-memory adapter (single-node mode).
  const redisReady = await new Promise((resolve) => {
    if (redis.isAvailable) {
      resolve(true);
      return;
    }
    const timeout = setTimeout(() => resolve(false), 3000);
    redis.once('ready', () => { clearTimeout(timeout); resolve(true); });
    redis.once('end',   () => { clearTimeout(timeout); resolve(false); });
  });

  if (redisReady && redis.isAvailable) {
    try {
      const pubClient = redis;
      const subClient = redis.duplicate();
      if (!subClient.isOpen) {
        try {
          await subClient.connect();
        } catch (connectErr) {
          if (!connectErr.message?.includes('Socket already opened')) {
            throw connectErr;
          }
        }
      }
      io.adapter(createAdapter(pubClient, subClient));
      io.redisAdapterEnabled = true;
      logger.info('[Socket.io] Using Redis pub/sub adapter (multi-instance mode)');
      console.log('✅ Socket.IO Redis Adapter Enabled');
    } catch (err) {
      logger.warn('[Socket.io] Failed to set up Redis adapter — using in-memory adapter:', err.message);
    }
  } else {
    logger.warn(
      '[Socket.io] Redis unavailable — using in-memory adapter. ' +
      'Chat fully functional on single server. ' +
      'For multi-server deployments, start a Redis instance.'
    );
  }

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

  logger.info('[Socket.io] Server initialized with JWT auth + Chat handlers');
  console.log('✅ Presence Service Started');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('[Socket.io] Not initialized. Call initSocket() first.');
  }
  return io;
};

export default { initSocket, getIO };

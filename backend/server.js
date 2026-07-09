/**
 * @file server.js
 * @description Application server entry point. Connects to database and binds standard listeners.
 * @author Antigravity
 */

import dotenv from 'dotenv';
import { createServer } from 'http';
import app from './src/app.js';
import logger from './src/config/logger.js';
import database from './src/config/database.js';
import { startEventScheduler } from './src/modules/events/event.scheduler.js';
import { startConnectionCleanupJob } from './src/jobs/connectionCleanup.job.js';
import { startImageKitCleanupJob } from './src/jobs/imagekitCleanup.job.js';
import { startPollExpiryJob } from './src/jobs/pollExpiry.job.js';
import { closeAllConnections } from './src/utils/multidbConnection.js';
import { initSocket, getIO } from './src/config/socket.js';
import { getActiveWrites } from './src/modules/chat/chat.socket.js';
import redisClient from './src/config/redis.js';

// Load environment variables
dotenv.config();

// Verify REDIS_URL exists
if (!process.env.REDIS_URL) {
  logger.error('❌ REDIS_URL is missing');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;
let isShuttingDown = false;



/**
 * Handle graceful shutdown of the application
 */
const shutdown = async (signal, error = null) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Received ${signal}. Gracefully shutting down servers...`);
  if (error) {
    logger.error(`Shutdown triggered due to error: ${error.message || error}`, { stack: error.stack });
  }

  try {
    const io = getIO();
    if (io) {
      io.isShuttingDown = true;
      logger.info('Socket.io marked as shutting down. Stop accepting new connections.');
    }
  } catch (e) {
    logger.warn(`Socket.io is not initialized or getIO failed: ${e.message}`);
  }

  // Close servers immediately to stop listening on ports
  if (server) {
    server.close(() => {
      logger.info('HTTP REST and Socket.io server closed.');
    });
  }

  // 5-second drain window
  const drainTimeout = 5000;
  const startTime = Date.now();

  const checkDrain = async () => {
    const activeWrites = getActiveWrites();
    const elapsed = Date.now() - startTime;

    if (activeWrites === 0 || elapsed >= drainTimeout) {
      if (activeWrites > 0) {
        logger.warn(`Drain timeout reached. Forcefully shutting down with ${activeWrites} active writes in-flight.`);
      } else {
        logger.info('All in-flight message saves completed.');
      }

      // Force disconnect remaining socket connections
      try {
        const io = getIO();
        if (io) {
          logger.info('Closing active socket connections...');
          io.disconnectSockets(true);
        }
      } catch (e) {
        logger.error(`Error disconnecting active sockets: ${e.message}`);
      }

      try {
        await closeAllConnections();
        logger.info('Closed all database tenant connections.');
      } catch (err) {
        logger.error(`Error closing tenant connections during shutdown: ${err.message}`);
      }

      try {
        if (redisClient.isAvailable) {
          await redisClient.quit();
          logger.info('Redis connection closed gracefully.');
        }
      } catch (redisErr) {
        logger.error(`Error closing Redis connection during shutdown: ${redisErr.message}`);
      }

      try {
        await database.disconnect();
        logger.info('Main database connection closed.');
      } catch (dbErr) {
        logger.error(`Error closing main database connection during shutdown: ${dbErr.message}`);
      }

      process.exit(error ? 1 : 0);
    } else {
      setTimeout(checkDrain, 100);
    }
  };

  await checkDrain();
};

/**
 * Initialize server database and bootstrap listening interface
 */
const bootstrap = async () => {
  try {
    // Connect to database (simulated/future integration)
    await database.connect();

    // Connect to Redis and verify connectivity
    try {
      await redisClient.connect();
      // Perform a functional test write check to ensure Redis is fully functional (e.g. not limited by free-tier limits)
      await redisClient.set('startup_test_key', 'ok', { EX: 2 });
      await redisClient.del('startup_test_key');
      const pingResponse = await redisClient.ping();
      logger.info('✅ Redis Connected');
      logger.info(`Redis Ping: ${pingResponse}`);
      console.log('✅ Redis Connected');
    } catch (err) {
      logger.error(`[Redis] Failed to connect or functional check failed on startup: ${err.message || err}`);
      redisClient.isAvailable = false;
      try {
        await redisClient.disconnect();
      } catch (_) {}
      logger.warn('[Redis] Operating in fallback offline mode (in-memory caching & rate-limiting enabled)');
    }

    // Start background meeting reminder checks
    startEventScheduler();

    // Start background multi-db connection cleanup checks
    startConnectionCleanupJob();

    // Start background poll expiry checks
    startPollExpiryJob();

    // Background ImageKit cleanup sweep disabled as per user instruction
    // startImageKitCleanupJob();

    const httpServer = createServer(app);
    await initSocket(httpServer);
    server = httpServer.listen(PORT, () => {
      logger.info(`  REST API Server and Socket.io running in [${NODE_ENV}] mode on port ${PORT}`);
      logger.info(`  Client URL allowed: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    });

  } catch (error) {
    logger.error('Failed to bootstrap application server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
});



process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  shutdown('uncaughtException', error);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap();

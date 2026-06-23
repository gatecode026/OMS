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

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize server database and bootstrap listening interface
 */
const bootstrap = async () => {
  try {
    // Connect to database (simulated/future integration)
    await database.connect();

    // Start background meeting reminder checks
    startEventScheduler();

    // Start background multi-db connection cleanup checks
    startConnectionCleanupJob();

    // Start background poll expiry checks
    startPollExpiryJob();

    // Background ImageKit cleanup sweep disabled as per user instruction
    // startImageKitCleanupJob();

    const httpServer = createServer(app);
    const server = httpServer.listen(PORT, () => {
      logger.info(`  REST API Server running in [${NODE_ENV}] mode on port ${PORT}`);
      logger.info(`  Client URL allowed: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    });

    // Run Socket.io on dedicated port 5001
    const socketPort = process.env.SOCKET_PORT || 5001;
    const socketHttpServer = createServer();
    await initSocket(socketHttpServer);
    const socketServer = socketHttpServer.listen(socketPort, () => {
      logger.info(`  Socket.io Server running on dedicated port ${socketPort}`);
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      logger.warn(`Received ${signal}. Gracefully shutting down servers...`);

      try {
        const io = getIO();
        if (io) {
          io.isShuttingDown = true;
          logger.info('Socket.io marked as shutting down. Stop accepting new connections.');
        }
      } catch (e) {
        logger.warn('Socket.io is not initialized or getIO failed:', e.message);
      }

      // Close servers immediately to stop listening on ports
      server.close(() => {
        logger.info('HTTP REST server closed.');
      });

      socketHttpServer.close(() => {
        logger.info('Socket.io HTTP server closed.');
      });

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
            logger.error('Error disconnecting active sockets:', e);
          }

          try {
            await closeAllConnections();
          } catch (err) {
            logger.error('Error closing tenant connections during shutdown:', err);
          }

          database.disconnect().then(() => {
            logger.info('Database connection closed.');
            process.exit(0);
          });
        } else {
          setTimeout(checkDrain, 100);
        }
      };

      checkDrain();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to bootstrap application server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, consider crashing or restarting the application gracefully
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

bootstrap();

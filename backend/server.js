/**
 * @file server.js
 * @description Application server entry point. Connects to database and binds standard listeners.
 * @author Antigravity
 */

import dotenv from 'dotenv';
import app from './src/app.js';
import logger from './src/config/logger.js';
import database from './src/config/database.js';
import { startEventScheduler } from './src/modules/events/event.scheduler.js';
import { startConnectionCleanupJob } from './src/jobs/connectionCleanup.job.js';
import { closeAllConnections } from './src/utils/multidbConnection.js';

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

    const server = app.listen(PORT, () => {
      logger.info(`  Server running in [${NODE_ENV}] mode on port ${PORT}`);
      logger.info(`  Client URL allowed: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      logger.warn(`Received ${signal}. Gracefully shutting down server...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await closeAllConnections();
        } catch (err) {
          logger.error('Error closing tenant connections during shutdown:', err);
        }
        database.disconnect().then(() => {
          logger.info('Database connection closed.');
          process.exit(0);
        });
      });
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

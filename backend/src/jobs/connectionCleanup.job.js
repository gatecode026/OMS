import { connectionCache } from '../utils/multidbConnection.js';
import logger from '../config/logger.js';

/**
 * Loops over the cache and closes connections that haven't been used in over 1 hour.
 */
export const cleanUnusedConnections = async () => {
  logger.info('Running background tenant connection cache cleanup job...');
  const now = Date.now();
  const oneHourMs = 3600000; // 1 hour in milliseconds
  
  const evictedTenants = [];
  const closePromises = [];

  for (const [tenantId, entry] of connectionCache.entries()) {
    // Only evict custom connections that were last used more than 1 hour ago
    if (entry.isCustom && (now - entry.lastUsedAt) > oneHourMs) {
      evictedTenants.push(tenantId);
      logger.info(`Evicting idle database connection for tenant ${tenantId} (Last used ${Math.round((now - entry.lastUsedAt) / 60000)}m ago)`);
      if (entry.connection) {
        closePromises.push(
          entry.connection.close()
            .then(() => {
              logger.info(`Successfully closed idle connection for tenant ${tenantId}`);
            })
            .catch((err) => {
              logger.error(`Error closing idle connection for tenant ${tenantId}:`, err);
            })
        );
      }
    }
  }

  await Promise.all(closePromises);
  
  // Remove from Map cache after close
  for (const tenantId of evictedTenants) {
    connectionCache.delete(tenantId);
  }

  logger.info(`Background tenant connection cleanup finished. Evicted ${evictedTenants.length} connection(s).`);
};

/**
 * Starts the connection cleanup job to run hourly.
 */
export const startConnectionCleanupJob = () => {
  logger.info('Initializing hourly Multi-Database Connection Cleanup background job...');
  
  // Run checks once initially after a 10 second grace period
  setTimeout(() => {
    cleanUnusedConnections().catch((err) => {
      logger.error('Error in initial run of cleanUnusedConnections:', err);
    });
  }, 10000);

  // Then check every 1 hour (3600000 ms)
  setInterval(async () => {
    try {
      await cleanUnusedConnections();
    } catch (err) {
      logger.error('Error running hourly cleanUnusedConnections cycle:', err);
    }
  }, 3600000);
};

export default {
  cleanUnusedConnections,
  startConnectionCleanupJob
};

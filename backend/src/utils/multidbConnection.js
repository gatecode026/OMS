import mongoose from 'mongoose';
import Company from '../modules/companies/company.model.js';
import logger from '../config/logger.js';
import env from '../config/env.js';

// Cache database URI for each companyId
export const dbUriCache = {};
// Cache active connection objects { connection, lastUsedAt, isCustom } using Map
export const connectionCache = new Map();

/**
 * Returns a connection for the tenant. Creates one if not present.
 * @param {string} tenantId 
 * @returns {Promise<mongoose.Connection>}
 */
export const getTenantConnection = async (tenantId) => {
  if (!tenantId || tenantId === 'COMP-DEFAULT') {
    return mongoose.connection;
  }

  // 1. Check Cache
  if (connectionCache.has(tenantId)) {
    const cached = connectionCache.get(tenantId);
    cached.lastUsedAt = Date.now();
    return cached.connection;
  }

  // 2. Fetch dbUri from Main DB
  let dbUri = dbUriCache[tenantId];
  if (dbUri === undefined) {
    try {
      // Find the company using the platform/main connection
      const company = await Company.findOne({ id: tenantId });
      dbUri = company?.settings?.dbUri || '';
      dbUriCache[tenantId] = dbUri;
    } catch (err) {
      logger.error(`Error resolving database URI for tenant ${tenantId}:`, err);
      dbUri = '';
    }
  }

  // 3. Fallback to default connection
  if (!dbUri) {
    connectionCache.set(tenantId, {
      connection: mongoose.connection,
      lastUsedAt: Date.now(),
      isCustom: false
    });
    return mongoose.connection;
  }

  // 4. LRU Eviction Check if Cache Limit is reached
  let customConnectionCount = 0;
  for (const entry of connectionCache.values()) {
    if (entry.isCustom) {
      customConnectionCount++;
    }
  }

  if (customConnectionCount >= env.multidbMaxTotalConnections) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of connectionCache.entries()) {
      if (entry.isCustom && entry.lastUsedAt < oldestTime) {
        oldestTime = entry.lastUsedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const oldestEntry = connectionCache.get(oldestKey);
      logger.info(`Evicting oldest connection in LRU cache for tenant ${oldestKey}`);
      try {
        await oldestEntry.connection.close();
      } catch (err) {
        logger.error(`Error closing connection for tenant ${oldestKey} during LRU eviction:`, err);
      }
      connectionCache.delete(oldestKey);
    }
  }

  // 5. Create and cache Connection Pool
  try {
    logger.info(`Establishing database connection pool for tenant ${tenantId} at: ${dbUri.replace(/:([^:@]+)@/, ':****@')}`);
    const connection = mongoose.createConnection(dbUri, {
      autoIndex: true,
      maxPoolSize: env.multidbMaxPoolSize,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    connection.on('error', (err) => {
      logger.error(`Database runtime connection error for tenant ${tenantId}: ${err}`);
    });

    connection.on('disconnected', () => {
      logger.warn(`Database connection lost for tenant ${tenantId}.`);
    });

    connectionCache.set(tenantId, {
      connection,
      lastUsedAt: Date.now(),
      isCustom: true
    });
    return connection;
  } catch (err) {
    logger.error(`Failed to connect to database for tenant ${tenantId}:`, err);
    connectionCache.set(tenantId, {
      connection: mongoose.connection,
      lastUsedAt: Date.now(),
      isCustom: false
    });
    return mongoose.connection;
  }
};

/**
 * Synchronously gets a cached connection for the tenant.
 * Falls back to main database connection if not cached.
 */
export const getCachedConnection = (tenantId) => {
  if (!tenantId || tenantId === 'COMP-DEFAULT') {
    return mongoose.connection;
  }
  const cached = connectionCache.get(tenantId);
  return cached ? cached.connection : mongoose.connection;
};

/**
 * Gracefully closes all custom connections in the cache.
 */
export const closeAllConnections = async () => {
  logger.info('Closing all custom tenant database connections...');
  const promises = [];
  for (const [tenantId, entry] of connectionCache.entries()) {
    if (entry.isCustom && entry.connection) {
      logger.info(`Closing connection for tenant ${tenantId}`);
      promises.push(
        entry.connection.close()
          .then(() => {
            logger.info(`Successfully closed connection for tenant ${tenantId}`);
          })
          .catch((err) => {
            logger.error(`Error closing connection for tenant ${tenantId}:`, err);
          })
      );
    }
  }
  await Promise.all(promises);
  connectionCache.clear();
};

export default {
  getTenantConnection,
  getCachedConnection,
  closeAllConnections,
  dbUriCache,
  connectionCache
};

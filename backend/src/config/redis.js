/**
 * @file src/config/redis.js
 * @description Redis client configuration and instance exporter using ioredis.
 */

import Redis from 'ioredis';
import logger from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Initialize Redis client with max retries and custom retry delays to avoid crash loops
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    // Retry connection after a short delay (up to 2 seconds)
    return Math.min(times * 100, 2000);
  }
});

redis.on('connect', () => {
  logger.info(`[Redis] Connected to Redis instance at ${REDIS_URL.split('@').pop()}`);
});

redis.on('error', (err) => {
  logger.error('[Redis] Error:', err.message || err);
});

export default redis;

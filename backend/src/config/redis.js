/**
 * @file src/config/redis.js
 * @description Redis client with graceful degradation.
 *   - Attempts to connect to Redis on startup.
 *   - If Redis is unavailable (e.g. local dev without Redis installed),
 *     the client stops retrying after MAX_RETRIES and marks itself unavailable.
 *   - All callers should use `redis.isAvailable` to guard optional Redis ops,
 *     or simply rely on the `.catch(() => ...)` fallbacks already in place.
 */

import Redis from 'ioredis';
import logger from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const MAX_RETRIES = 3;     // Stop retrying after this many attempts
const LOG_THROTTLE_MS = 30_000; // Only log repeated errors every 30 s

let retryCount = 0;
let lastErrorLoggedAt = 0;

// ── Initialize client ────────────────────────────────────────────────────────
const redis = new Redis(REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 0,   // Don't hang individual commands waiting for reconnect
  enableOfflineQueue: false, // Fail commands immediately when disconnected
  retryStrategy(times) {
    retryCount = times;
    if (times > MAX_RETRIES) {
      // Stop retrying — Redis is simply not available in this environment
      redis.isAvailable = false;
      return null; // null = stop reconnecting
    }
    return Math.min(times * 500, 2000);
  }
});

// Publicly readable flag — other modules check this before using Redis
redis.isAvailable = false;

redis.on('connect', () => {
  redis.isAvailable = true;
  retryCount = 0;
  logger.info(`[Redis] Connected successfully at ${REDIS_URL.replace(/\/\/.*@/, '//')}`);
});

redis.on('ready', () => {
  redis.isAvailable = true;
  logger.info('[Redis] Client is ready to accept commands');
});

redis.on('error', (err) => {
  redis.isAvailable = false;
  const now = Date.now();
  // Only log if this is the first error OR 30 s has passed since last log
  if (now - lastErrorLoggedAt > LOG_THROTTLE_MS || retryCount <= 1) {
    lastErrorLoggedAt = now;
    if (err.code === 'ECONNREFUSED') {
      logger.warn(
        `[Redis] Connection refused at ${REDIS_URL.replace(/\/\/.*@/, '//')} ` +
        `(attempt ${retryCount}/${MAX_RETRIES}). ` +
        `App will run without Redis — presence & pub/sub features degraded.`
      );
    } else {
      logger.error('[Redis] Error:', err.message || err);
    }
  }
});

redis.on('close', () => {
  if (redis.isAvailable) {
    redis.isAvailable = false;
    logger.warn('[Redis] Connection closed');
  }
});

redis.on('end', () => {
  redis.isAvailable = false;
  if (retryCount > MAX_RETRIES) {
    logger.warn('[Redis] Gave up reconnecting after max retries. Running without Redis.');
  }
});

// ── Safe wrapper ─────────────────────────────────────────────────────────────
// Convenience helper — silently no-ops when Redis is down
redis.safeExec = async (fn) => {
  if (!redis.isAvailable) return null;
  try {
    return await fn(redis);
  } catch (err) {
    logger.warn('[Redis] Safe exec failed:', err.message);
    return null;
  }
};

// ── Duplicate factory (error handler auto-attached) ───────────────────────────
const originalDuplicate = redis.duplicate.bind(redis);
redis.duplicate = function (...args) {
  const dup = originalDuplicate(...args);
  // Inherit availability flag
  dup.isAvailable = redis.isAvailable;
  dup.on('connect', () => { dup.isAvailable = true; });
  dup.on('ready',   () => { dup.isAvailable = true; });
  dup.on('error',   () => { dup.isAvailable = false; });
  dup.on('end',     () => { dup.isAvailable = false; });
  return dup;
};

export default redis;

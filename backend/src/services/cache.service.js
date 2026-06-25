/**
 * @file src/services/cache.service.js
 * @description Centralized caching layer using Upstash Redis with MongoDB fallback.
 */

import redis from "../config/redis.js";
import logger from "../config/logger.js";

// Global in-memory stats for fallback and aggregation
let localHits = 0;
let localMisses = 0;
let localLatencySum = 0;
let localLatencyCount = 0;
const serviceStartTime = Date.now();

/**
 * Named TTL constants (in seconds)
 */
export const TTL = {
  USER_PROFILE: 1800,        // 30 min
  COMPANY_SETTINGS: 3600,    // 1 hour
  CONVERSATION: 600,         // 10 min
  RECENT_MESSAGES: 300,      // 5 min
  SIDEBAR: 120,              // 2 min
  GROUP_MEMBERS: 600,        // 10 min
  DASHBOARD: 300,            // 5 min
  LOOKUP: 43200,             // 12 hours
  ONLINE_USERS: 120,         // 2 min
  EMPLOYEE_LIST: 300,        // 5 min
  ROLES: 3600,               // 1 hour
};

/**
 * Key builder functions for consistent, company-scoped naming
 */
export const CacheKeys = {
  user: (companyId, userId) => `user:${companyId}:${userId}`,
  company: (companyId) => `company:${companyId}`,
  conv: (companyId, conversationId) => `conv:${companyId}:${conversationId}`,
  convMsgs: (companyId, conversationId) => `conv_msgs:${companyId}:${conversationId}`,
  sidebar: (companyId, userId) => `sidebar:${companyId}:${userId}`,
  groupMembers: (companyId, conversationId) => `group_members:${companyId}:${conversationId}`,
  dashboard: (companyId) => `dashboard:${companyId}`,
  lookup: (companyId, type) => `lookup:${companyId}:${type}`,
  online: (companyId) => `online:${companyId}`,
  empList: (companyId) => `emp_list:${companyId}`,
  roles: (companyId) => `roles:${companyId}`,
};

/**
 * Helper to record operation latency
 */
function recordLatency(ms) {
  localLatencySum += ms;
  localLatencyCount++;
  // Increment in Redis if available (fire-and-forget, non-blocking)
  if (redis.isAvailable) {
    redis.incrBy("cache:stats:latency_sum", Math.round(ms)).catch(() => {});
    redis.incr("cache:stats:latency_count").catch(() => {});
  }
}

/**
 * Fetch a value from cache, parse JSON, handle errors safely
 */
export async function cacheGet(key) {
  if (!redis.isAvailable) {
    return null;
  }
  const start = performance.now();
  try {
    const data = await redis.get(key);
    const end = performance.now();
    recordLatency(end - start);

    if (data === null || data === undefined) {
      return null;
    }
    return JSON.parse(data);
  } catch (err) {
    logger.warn(`[CACHE ERROR] key=${key} err=${err.message} → MongoDB fallback`);
    return null;
  }
}

/**
 * Save a value to cache as serialized JSON, handle errors safely
 */
export async function cacheSet(key, value, ttlSeconds = 300) {
  if (!redis.isAvailable) {
    return false;
  }
  const start = performance.now();
  try {
    const serialized = JSON.stringify(value);
    const byteLength = Buffer.byteLength(serialized, 'utf8');
    await redis.set(key, serialized, { EX: ttlSeconds });
    const end = performance.now();
    recordLatency(end - start);

    logger.info(`[CACHE SET] key=${key} ttl=${ttlSeconds}s bytes=${byteLength}`);
    return true;
  } catch (err) {
    logger.error(`[CACHE ERROR] Failed to set key=${key} err=${err.message}`);
    return false;
  }
}

/**
 * Delete one or more keys from cache
 */
export async function cacheDel(...keys) {
  if (!redis.isAvailable || keys.length === 0) {
    return 0;
  }
  const flatKeys = keys.flat(Infinity);
  if (flatKeys.length === 0) {
    return 0;
  }
  try {
    const deletedCount = await redis.del(flatKeys);
    flatKeys.forEach(k => logger.info(`[CACHE INVALIDATED] key=${k}`));
    return deletedCount;
  } catch (err) {
    logger.error(`[CACHE ERROR] Failed to delete keys=${flatKeys.join(', ')} err=${err.message}`);
    return 0;
  }
}

/**
 * Find and delete all keys matching a glob pattern using SCAN
 */
export async function cacheDelPattern(pattern) {
  if (!redis.isAvailable) {
    return 0;
  }
  try {
    const keys = [];
    // Node-redis v4 scanIterator makes it easy and memory-safe
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      if (Array.isArray(key)) {
        keys.push(...key);
      } else if (key) {
        keys.push(key);
      }
    }
    
    if (keys.length > 0) {
      await redis.del(keys);
      logger.info(`[CACHE PATTERN DEL] pattern=${pattern} deleted=${keys.length} keys`);
      keys.forEach(k => logger.info(`[CACHE INVALIDATED] key=${k}`));
      return keys.length;
    }
    return 0;
  } catch (err) {
    logger.error(`[CACHE ERROR] Failed to delete pattern=${pattern} err=${err.message}`);
    return 0;
  }
}

/**
 * Cache-aside helper function: returns cached data if hit, otherwise fetches, caches, and returns
 */
export async function cacheGetOrSet(key, fetchFn, ttlSeconds = 300) {
  const cachedVal = await cacheGet(key);
  
  if (cachedVal !== null) {
    localHits++;
    if (redis.isAvailable) {
      redis.incr("cache:stats:hits").catch(() => {});
    }
    logger.info(`[CACHE HIT] key=${key}`);
    return cachedVal;
  }
  
  localMisses++;
  if (redis.isAvailable) {
    redis.incr("cache:stats:misses").catch(() => {});
  }
  logger.info(`[CACHE MISS] key=${key} → MongoDB fallback`);

  const freshData = await fetchFn();
  if (freshData !== null && freshData !== undefined) {
    await cacheSet(key, freshData, ttlSeconds);
  }
  return freshData;
}

/**
 * Compile hit rates, latency and memory usage stats from Redis & local memory
 */
export async function cacheStats() {
  let redisHits = localHits;
  let redisMisses = localMisses;
  let redisLatencySum = localLatencySum;
  let redisLatencyCount = localLatencyCount;
  let memoryUsage = "0 B";
  let status = "disconnected";

  if (redis.isAvailable) {
    status = "connected";
    try {
      // Try to fetch distributed stats from Redis
      const [h, m, lSum, lCount] = await Promise.all([
        redis.get("cache:stats:hits"),
        redis.get("cache:stats:misses"),
        redis.get("cache:stats:latency_sum"),
        redis.get("cache:stats:latency_count"),
      ]);

      if (h !== null) redisHits = parseInt(h, 10);
      if (m !== null) redisMisses = parseInt(m, 10);
      if (lSum !== null && lCount !== null) {
        redisLatencySum = parseInt(lSum, 10);
        redisLatencyCount = parseInt(lCount, 10);
      }

      // Query Redis info for memory usage
      const info = await redis.info("memory");
      const memMatch = info.match(/used_memory_human:([^\r\n]+)/);
      if (memMatch && memMatch[1]) {
        memoryUsage = memMatch[1].trim();
      }
    } catch (err) {
      logger.warn(`[CACHE STATS ERROR] Failed to fetch stats from Redis: ${err.message}`);
    }
  }

  const totalRequests = redisHits + redisMisses;
  const hitRate = totalRequests > 0 ? ((redisHits / totalRequests) * 100).toFixed(1) : "0.0";
  const missRate = totalRequests > 0 ? ((redisMisses / totalRequests) * 100).toFixed(1) : "0.0";
  
  const avgLatency = redisLatencyCount > 0 
    ? (redisLatencySum / redisLatencyCount).toFixed(1)
    : "0.0";

  // Calculate Uptime
  const uptimeMs = Date.now() - serviceStartTime;
  const h = Math.floor(uptimeMs / 3600000);
  const m = Math.floor((uptimeMs % 3600000) / 60000);
  const uptimeStr = `${h}h ${m}m`;

  return {
    redis: status,
    cacheHitRate: `${hitRate}%`,
    cacheMissRate: `${missRate}%`,
    totalRequests,
    hits: redisHits,
    misses: redisMisses,
    memoryUsage,
    latency: `${avgLatency}ms`,
    uptime: uptimeStr,
  };
}

/**
 * Flush all cache keys (Admin tool)
 */
export async function cacheFlushAll() {
  if (!redis.isAvailable) {
    return false;
  }
  try {
    await redis.flushDb();
    // Reset local metrics
    localHits = 0;
    localMisses = 0;
    localLatencySum = 0;
    localLatencyCount = 0;
    
    // Reset Redis counters
    await Promise.all([
      redis.set("cache:stats:hits", "0"),
      redis.set("cache:stats:misses", "0"),
      redis.set("cache:stats:latency_sum", "0"),
      redis.set("cache:stats:latency_count", "0"),
    ]);

    logger.info("[CACHE FLUSHED] All cache keys cleared from Redis");
    return true;
  } catch (err) {
    logger.error(`[CACHE ERROR] Failed to flush cache db: ${err.message}`);
    return false;
  }
}

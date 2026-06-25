/**
 * @file src/services/rateLimiter.service.js
 * @description Centralized Redis-backed distributed rate limiting service for REST APIs and Socket.io.
 */

import redis from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Checks if a key exceeds the specified rate limit.
 * Uses atomic Redis transactions (INCR + TTL + EXPIRE) to prevent race conditions.
 * @param {String} key - The unique identifier (e.g. rate:auth:login:127.0.0.1)
 * @param {Number} limit - Allowed request count in the window
 * @param {Number} windowSeconds - Expire window in seconds
 * @returns {Promise<Object>} - { allowed: Boolean, current: Number, limit: Number, ttl: Number }
 */
export const checkRateLimit = async (key, limit, windowSeconds = 60) => {
  if (!redis.isAvailable) {
    // Fail-safe: if Redis is offline, allow the request to prevent service disruption.
    logger.warn(`[RateLimiter] Redis offline; allowing request for key: ${key}`);
    return { allowed: true, current: 1, limit, ttl: windowSeconds };
  }

  try {
    const multi = redis.multi();
    multi.incr(key);
    multi.ttl(key);
    
    const results = await multi.exec();
    if (!results || results.length < 2) {
      throw new Error('Redis transaction execution returned empty result.');
    }

    const current = results[0];
    let ttl = results[1];

    // If key was just created, set the TTL
    if (ttl === -1 || ttl === null) {
      await redis.expire(key, windowSeconds);
      ttl = windowSeconds;
    }

    const allowed = current <= limit;
    
    if (!allowed) {
      logger.warn(`[RateLimiter] Rate limit exceeded for key=${key}. Current=${current}/${limit} TTL=${ttl}s`);
    }

    return {
      allowed,
      current,
      limit,
      ttl: Math.max(0, ttl)
    };
  } catch (err) {
    logger.error(`[RateLimiter] Error performing rate limit check: ${err.message}`);
    // Fail-safe
    return { allowed: true, current: 1, limit, ttl: windowSeconds };
  }
};

export default {
  checkRateLimit
};

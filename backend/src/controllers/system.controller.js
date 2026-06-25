/**
 * @file src/controllers/system.controller.js
 * @description System monitoring and administration endpoints (cache health, statistics, flushing).
 */

import { cacheStats, cacheFlushAll } from '../services/cache.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * GET /api/system/cache-health
 * Returns the Redis cache health status and stats directly at root (exactly matching the spec).
 */
export const getCacheHealth = async (req, res) => {
  try {
    const stats = await cacheStats();
    return res.status(200).json(stats);
  } catch (err) {
    return res.status(500).json({
      redis: "disconnected",
      error: err.message
    });
  }
};

/**
 * GET /api/system/cache-stats
 * Returns the Redis cache statistics enveloped.
 */
export const getCacheStats = async (req, res) => {
  try {
    const stats = await cacheStats();
    return successResponse(res, stats, 'Cache statistics retrieved successfully');
  } catch (err) {
    return errorResponse(res, `Failed to retrieve cache stats: ${err.message}`, 500);
  }
};

/**
 * POST /api/system/cache-flush
 * Flushes all cache keys in Redis (Admin only).
 */
export const flushCache = async (req, res) => {
  try {
    // Only allow admin or super_admin
    if (req.user && !['admin', 'super_admin'].includes(req.user.roleId)) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: Only administrators can flush the cache'
      });
    }

    const flushed = await cacheFlushAll();
    if (flushed) {
      return successResponse(res, null, 'Cache database flushed successfully');
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to flush cache database (Redis might be unavailable)'
      });
    }
  } catch (err) {
    return errorResponse(res, `Failed to flush cache: ${err.message}`, 500);
  }
};

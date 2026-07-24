/**
 * @file src/services/health.service.js
 * @description Aggregates health diagnostics for Redis, MongoDB, Socket.IO, and OS/System status.
 */

import mongoose from 'mongoose';
import redis from '../config/redis.js';
import { getIO } from '../config/socket.js';
import os from 'os';
import logger from '../config/logger.js';

/**
 * Checks MongoDB connection health.
 * @returns {Promise<Object>}
 */
export const checkMongoHealth = async () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  const code = mongoose.connection.readyState;
  const status = stateMap[code] || 'unknown';
  const isHealthy = code === 1;

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    connectionState: status,
    readyStateCode: code,
    timestamp: new Date().toISOString()
  };
};

/**
 * Checks Redis connection health and runs a ping.
 * @returns {Promise<Object>}
 */
export const checkRedisHealth = async () => {
  if (process.env.DISABLE_REDIS === 'true') {
    return {
      status: 'healthy',
      connection: 'disabled',
      pingLatency: '0ms',
      timestamp: new Date().toISOString()
    };
  }

  let redisStatus = 'disconnected';
  let isHealthy = false;
  let latencyMs = 0;

  if (redis.isAvailable) {
    try {
      const start = performance.now();
      const pingPromise = redis.ping();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout (1500ms)')), 1500)
      );

      const pingResponse = await Promise.race([pingPromise, timeoutPromise]);
      const end = performance.now();
      latencyMs = Math.round(end - start);
      if (pingResponse === 'PONG') {
        redisStatus = 'connected';
        isHealthy = true;
      }
    } catch (err) {
      logger.warn(`[Health] Redis ping check failed: ${err.message}`);
    }
  }

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    connection: redisStatus,
    pingLatency: `${latencyMs}ms`,
    timestamp: new Date().toISOString()
  };
};

/**
 * Checks Socket.IO status and active connections.
 * @returns {Promise<Object>}
 */
export const checkSocketHealth = async () => {
  let adapterStatus = 'disabled';
  let connectionCount = 0;
  let isHealthy = false;

  try {
    const io = getIO();
    if (io) {
      isHealthy = true;
      if (io.redisAdapterEnabled) {
        adapterStatus = 'enabled';
      }
      // Get all connected socket count
      connectionCount = io.engine.clientsCount;
    }
  } catch (err) {
    // Socket.io not initialized or threw error
  }

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    adapter: adapterStatus,
    activeConnections: connectionCount,
    timestamp: new Date().toISOString()
  };
};

/**
 * Checks system stats (CPU, Memory, Load Avg).
 * @returns {Promise<Object>}
 */
export const checkSystemHealth = async () => {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usedMem = totalMem - freeMem;

  return {
    status: 'healthy',
    uptime: process.uptime(),
    nodeVersion: process.version,
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch()
    },
    cpu: {
      loadAvg: os.loadavg(),
      cores: os.cpus().length
    },
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedPercent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Checks overall application status. Returns 200 if all critical components are healthy.
 * @returns {Promise<Object>}
 */
export const checkAllHealth = async () => {
  const mongo = await checkMongoHealth();
  const redisHealth = await checkRedisHealth();
  const socket = await checkSocketHealth();
  
  const isHealthy = mongo.status === 'healthy';

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    message: isHealthy ? 'All services are fully operational' : 'Some backing services are unhealthy',
    timestamp: new Date().toISOString(),
    mongo: { status: mongo.status, state: mongo.connectionState },
    redis: { status: redisHealth.status, connection: redisHealth.connection },
    socket: { status: socket.status, activeConnections: socket.activeConnections },
    vapid: {
      keysConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      publicKeyLength: process.env.VAPID_PUBLIC_KEY ? process.env.VAPID_PUBLIC_KEY.length : 0
    }
  };
};

export default {
  checkMongoHealth,
  checkRedisHealth,
  checkSocketHealth,
  checkSystemHealth,
  checkAllHealth
};

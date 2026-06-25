/**
 * @file src/services/monitoring.service.js
 * @description Centralized application performance monitoring. Tracks CPU, memory, event loop lag, latencies, error counts, and outputs Prometheus metrics.
 */

import { cacheStats } from './cache.service.js';
import redis from '../config/redis.js';
import mongoose from 'mongoose';

// Internal metric counters
const metrics = {
  activeHttpRequests: 0,
  totalHttpRequests: 0,
  failedHttpRequests: 0,
  failedLogins: 0,
  activeSocketConnections: 0,
  socketErrors: 0,
  apiLatencySum: 0,
  apiLatencyCount: 0,
  mongoLatencySum: 0,
  mongoLatencyCount: 0,
};

// Event loop lag tracker
let eventLoopLag = 0;
let lastLagCheck = Date.now();

setInterval(() => {
  const time = Date.now();
  const lag = time - lastLagCheck - 1000; // Expected delay is 1000ms
  eventLoopLag = Math.max(0, lag);
  lastLagCheck = time;
}, 1000).unref(); // Use unref() so this timer does not keep node process alive

/**
 * Increment a performance counter.
 * @param {String} metricName - Name of the metric to increment.
 */
export const incrementMetric = (metricName) => {
  if (metrics[metricName] !== undefined) {
    metrics[metricName]++;
  }
};

/**
 * Decrement a performance counter.
 * @param {String} metricName - Name of the metric to decrement.
 */
export const decrementMetric = (metricName) => {
  if (metrics[metricName] !== undefined) {
    metrics[metricName]--;
  }
};

/**
 * Record operation latency for a component.
 * @param {String} component - 'api' | 'mongodb'
 * @param {Number} ms - Duration in milliseconds
 */
export const recordComponentLatency = (component, ms) => {
  if (component === 'api') {
    metrics.apiLatencySum += ms;
    metrics.apiLatencyCount++;
  } else if (component === 'mongodb') {
    metrics.mongoLatencySum += ms;
    metrics.mongoLatencyCount++;
  }
};

/**
 * Measure event loop lag, system stats, DB connection, and cache stats
 * @returns {Promise<Object>}
 */
export const gatherSystemMetrics = async () => {
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  
  // Calculate average latencies
  const avgApiLatency = metrics.apiLatencyCount > 0 ? (metrics.apiLatencySum / metrics.apiLatencyCount).toFixed(2) : '0.00';
  const avgMongoLatency = metrics.mongoLatencyCount > 0 ? (metrics.mongoLatencySum / metrics.mongoLatencyCount).toFixed(2) : '0.00';

  // Get cache stats
  const cStats = await cacheStats();

  // Try to estimate Redis/MongoDB connection status
  const mongoStatus = mongoose.connection.readyState === 1 ? 1 : 0;
  const redisStatus = redis.isAvailable ? 1 : 0;

  return {
    uptime: process.uptime(),
    memoryUsage: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
    cpuUsage: {
      user: cpu.user,
      system: cpu.system,
    },
    eventLoopLagMs: eventLoopLag,
    connections: {
      activeSockets: metrics.activeSocketConnections,
      activeHttp: metrics.activeHttpRequests,
      totalHttp: metrics.totalHttpRequests,
    },
    failures: {
      httpErrors: metrics.failedHttpRequests,
      failedLogins: metrics.failedLogins,
      socketErrors: metrics.socketErrors,
    },
    latencies: {
      apiAvgMs: parseFloat(avgApiLatency),
      mongoAvgMs: parseFloat(avgMongoLatency),
      redisAvgMs: parseFloat(cStats.latency.replace('ms', '') || '0.0'),
    },
    status: {
      mongoConnected: mongoStatus,
      redisConnected: redisStatus,
    },
    cache: {
      hitRate: parseFloat(cStats.cacheHitRate.replace('%', '') || '0.0'),
      missRate: parseFloat(cStats.cacheMissRate.replace('%', '') || '0.0'),
      totalRequests: cStats.totalRequests,
    }
  };
};

/**
 * Expose gathered metrics in standard Prometheus exposition format.
 * @returns {Promise<String>}
 */
export const getPrometheusMetrics = async () => {
  const m = await gatherSystemMetrics();
  
  return [
    '# HELP node_uptime The uptime of the server in seconds',
    '# TYPE node_uptime gauge',
    `node_uptime ${m.uptime}`,
    
    '# HELP node_memory_rss Resident set size in bytes',
    '# TYPE node_memory_rss gauge',
    `node_memory_rss ${m.memoryUsage.rss}`,
    
    '# HELP node_memory_heap_used Heap used in bytes',
    '# TYPE node_memory_heap_used gauge',
    `node_memory_heap_used ${m.memoryUsage.heapUsed}`,
    
    '# HELP node_event_loop_lag_ms Event loop lag in milliseconds',
    '# TYPE node_event_loop_lag_ms gauge',
    `node_event_loop_lag_ms ${m.eventLoopLagMs}`,
    
    '# HELP active_http_requests Currently active REST API requests',
    '# TYPE active_http_requests gauge',
    `active_http_requests ${m.connections.activeHttp}`,
    
    '# HELP total_http_requests Cumulative HTTP requests received',
    '# TYPE total_http_requests counter',
    `total_http_requests ${m.connections.totalHttp}`,
    
    '# HELP failed_http_requests Cumulative HTTP requests resulting in error response',
    '# TYPE failed_http_requests counter',
    `failed_http_requests ${m.failures.httpErrors}`,
    
    '# HELP failed_logins Cumulative failed authentication attempts',
    '# TYPE failed_logins counter',
    `failed_logins ${m.failures.failedLogins}`,
    
    '# HELP active_socket_connections Currently active Socket.io connections',
    '# TYPE active_socket_connections gauge',
    `active_socket_connections ${m.connections.activeSockets}`,
    
    '# HELP socket_errors Cumulative Socket.io errors',
    '# TYPE socket_errors counter',
    `socket_errors ${m.failures.socketErrors}`,
    
    '# HELP api_latency_avg_ms Average HTTP API request processing duration',
    '# TYPE api_latency_avg_ms gauge',
    `api_latency_avg_ms ${m.latencies.apiAvgMs}`,
    
    '# HELP mongo_latency_avg_ms Average MongoDB query response duration',
    '# TYPE mongo_latency_avg_ms gauge',
    `mongo_latency_avg_ms ${m.latencies.mongoAvgMs}`,
    
    '# HELP redis_latency_avg_ms Average Redis command execution duration',
    '# TYPE redis_latency_avg_ms gauge',
    `redis_latency_avg_ms ${m.latencies.redisAvgMs}`,
    
    '# HELP mongo_connected MongoDB connection availability state',
    '# TYPE mongo_connected gauge',
    `mongo_connected ${m.status.mongoConnected}`,
    
    '# HELP redis_connected Redis connection availability state',
    '# TYPE redis_connected gauge',
    `redis_connected ${m.status.redisConnected}`,
    
    '# HELP cache_hit_rate Percentage of requests hitting Redis cache',
    '# TYPE cache_hit_rate gauge',
    `cache_hit_rate ${m.cache.hitRate}`,
  ].join('\n') + '\n';
};

export default {
  incrementMetric,
  decrementMetric,
  recordComponentLatency,
  gatherSystemMetrics,
  getPrometheusMetrics
};

/**
 * @file src/routes/health.routes.js
 * @description Express routes for health monitoring and diagnostics.
 */

import express from 'express';
import {
  checkMongoHealth,
  checkRedisHealth,
  checkSocketHealth,
  checkSystemHealth,
  checkAllHealth
} from '../services/health.service.js';
import { getPrometheusMetrics, gatherSystemMetrics } from '../services/monitoring.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * GET /health
 * Overall health check status.
 */
router.get('/', async (req, res) => {
  try {
    const health = await checkAllHealth();
    const code = health.status === 'healthy' ? 200 : 503;
    return res.status(code).json(health);
  } catch (err) {
    return res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

/**
 * GET /health/mongodb
 * MongoDB connection diagnostics.
 */
router.get('/mongodb', async (req, res) => {
  try {
    const check = await checkMongoHealth();
    const code = check.status === 'healthy' ? 200 : 503;
    return res.status(code).json(check);
  } catch (err) {
    return res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

/**
 * GET /health/redis
 * Redis connection diagnostics.
 */
router.get('/redis', async (req, res) => {
  try {
    const check = await checkRedisHealth();
    const code = check.status === 'healthy' ? 200 : 503;
    return res.status(code).json(check);
  } catch (err) {
    return res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

/**
 * GET /health/socket
 * Socket.io presence and connections diagnostics.
 */
router.get('/socket', async (req, res) => {
  try {
    const check = await checkSocketHealth();
    const code = check.status === 'healthy' ? 200 : 503;
    return res.status(code).json(check);
  } catch (err) {
    return res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

/**
 * GET /health/system
 * Server OS resources diagnostics.
 */
router.get('/system', async (req, res) => {
  try {
    const check = await checkSystemHealth();
    return res.status(200).json(check);
  } catch (err) {
    return res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

/**
 * GET /api/system/metrics (Prometheus format)
 * Exposes system performance metrics.
 */
router.get('/metrics', async (req, res) => {
  try {
    const format = req.query.format || 'prometheus';
    if (format === 'json') {
      const stats = await gatherSystemMetrics();
      return res.status(200).json(stats);
    }
    const metricsText = await getPrometheusMetrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.status(200).send(metricsText);
  } catch (err) {
    return res.status(500).send(`# ERROR: ${err.message}\n`);
  }
});

export default router;

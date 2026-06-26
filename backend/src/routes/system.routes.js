/**
 * @file src/routes/system.routes.js
 * @description Express routes definition for System endpoints.
 */

import express from 'express';
import { getCacheHealth, getCacheStats, flushCache } from '../controllers/system.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/system/cache-health (public/monitor endpoint, or authenticated depending on policy - let's make it authenticated to be secure but allow easy requests)
router.get('/cache-health', getCacheHealth);
router.get('/cache-stats', authenticate, getCacheStats);
router.post('/cache-flush', authenticate, flushCache);

export default router;

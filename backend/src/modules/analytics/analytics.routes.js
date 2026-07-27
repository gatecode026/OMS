/**
 * @file src/modules/analytics/analytics.routes.js
 * @description Express routes for Analytics module endpoints.
 */

import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { tenantMiddleware } from '../../middlewares/tenant.middleware.js';
import controller from './analytics.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(tenantMiddleware);

router.get('/dashboard', controller.getDashboard);
router.get('/performance', controller.getPerformance);
router.get('/departments', controller.getDepartments);
router.get('/reports', controller.getReports);
router.get('/search', controller.search);
router.post('/refresh', controller.refresh);

export default router;

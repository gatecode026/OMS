/**
 * @file src/modules/performance/performance.routes.js
 * @description API Routes for OKR Goals and Performance Improvement Plans (PIPs).
 */

import express from 'express';
import controller from './performance.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Authenticate all routes
router.use(authenticate);

// Goals OKR Routes
router.route('/goals')
  .get(controller.getGoals)
  .post(controller.postGoal);

router.route('/goals/:id')
  .put(controller.putGoal)
  .delete(controller.deleteGoal);

// PIP Routes
router.route('/pips')
  .get(controller.getPips)
  .post(controller.postPip);

router.route('/pips/:id')
  .put(controller.putPip)
  .delete(controller.deletePip);

export default router;

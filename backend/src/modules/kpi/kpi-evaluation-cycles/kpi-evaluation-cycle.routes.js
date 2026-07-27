/**
 * @file src/modules/kpi/kpi-evaluation-cycles/kpi-evaluation-cycle.routes.js
 * @description API Routes for KPI Evaluation Cycles.
 */

import express from 'express';
import controller from './kpi-evaluation-cycle.controller.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(controller.getCycles)
  .post(controller.postCycle);

router.route('/:id')
  .get(controller.getCycleById);

router.route('/:id/submit')
  .post(controller.postSubmit);

router.route('/:id/approve')
  .post(controller.postApprove);

router.route('/:id/lock')
  .post(controller.postLock);

export default router;

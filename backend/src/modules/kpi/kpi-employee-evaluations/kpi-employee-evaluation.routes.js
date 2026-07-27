/**
 * @file src/modules/kpi/kpi-employee-evaluations/kpi-employee-evaluation.routes.js
 * @description API Routes for KPI Employee Evaluations.
 */

import express from 'express';
import controller from './kpi-employee-evaluation.controller.js';
import { authenticate } from '../../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(controller.getEvaluations);

router.route('/:id')
  .get(controller.getEvaluationById);

router.route('/employee/:employeeId')
  .get(controller.getEvaluationsByEmployee);

router.route('/cycle/:cycleId')
  .get(controller.getEvaluationsByCycle);

router.route('/:id/scores')
  .patch(controller.patchScores);

router.route('/:id/refresh-auto-scores')
  .post(controller.postRefreshAutoScores);

router.route('/:id/submit')
  .post(controller.postSubmit);

router.route('/:id/return')
  .post(controller.postReturn);

router.route('/:id/approve')
  .post(controller.postApprove);

router.route('/:id/lock')
  .post(controller.postLock);

router.route('/:id/reopen')
  .post(controller.postReopen);

export default router;

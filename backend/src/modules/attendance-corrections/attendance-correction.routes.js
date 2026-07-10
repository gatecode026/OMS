/**
 * @file src/modules/attendance-corrections/attendance-correction.routes.js
 * @description Routes for Attendance Correction request workflow.
 */

import express from 'express';
import controller from './attendance-correction.controller.js';
import validation from './attendance-correction.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, checkPermission } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Enforce authentication on all correction endpoints
router.use(authenticate);

router.route('/')
  .get(checkPermission('Attendance', 'read'), controller.getAll)
  .post(validateRequest(validation.create), checkPermission('Attendance', 'create'), controller.create);

router.route('/:id')
  .get(checkPermission('Attendance', 'read'), controller.getById)
  .put(validateRequest(validation.update), controller.update);

router.post('/:id/approve', checkPermission('Attendance', 'approve'), controller.approve);
router.post('/:id/reject', checkPermission('Attendance', 'approve'), controller.reject);
router.post('/:id/more-info', checkPermission('Attendance', 'approve'), controller.moreInfo);

export default router;

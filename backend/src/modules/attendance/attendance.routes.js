/**
 * @file src/modules/attendance/attendance.routes.js
 * @description Routes for Attendance module.
 */

import express from 'express';
import controller from './attendance.controller.js';
import validation from './attendance.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes placeholder
router.get('/public', controller.getPublicData);

// Secured routes boundary
router.use(authenticate);

router.post('/qr-punch', controller.qrPunch);

router.route('/')
  .get(controller.getAll)
  .post(validateRequest(validation.create), controller.create);

router.get('/today', controller.getToday);
router.get('/summary', controller.getSummary);
router.get('/payroll-summary', controller.getPayrollSummary);

router.route('/:id')
  .get(controller.getById)
  .put(validateRequest(validation.update), controller.update)
  .delete(restrictTo('super_admin'), controller.remove);

export default router;

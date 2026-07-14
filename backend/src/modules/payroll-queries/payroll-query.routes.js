/**
 * @file src/modules/payroll-queries/payroll-query.routes.js
 * @description Routes for Payroll Queries disputes.
 */

import express from 'express';
import * as controller from './payroll-query.controller.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Authenticate all routes
router.use(authenticate);

// List/create queries
router.route('/')
  .get(controller.getAllQueries)
  .post(controller.createDispute);

// Details by ID
router.route('/:id')
  .get(controller.getQueryById);

// Ticket message comment
router.route('/:id/comment')
  .post(controller.postComment);

// HR Actions: internal notes and ticket status resolutions
router.route('/:id/internal-note')
  .post(restrictTo('hr_manager', 'finance_manager', 'branch_manager', 'branch_admin', 'super_admin', 'manager'), controller.postInternalNote);

router.route('/:id/action')
  .post(restrictTo('hr_manager', 'finance_manager', 'branch_manager', 'branch_admin', 'super_admin', 'manager'), controller.processHRAction);

router.route('/recalculate/:payrollId')
  .post(restrictTo('hr_manager', 'finance_manager', 'branch_manager', 'branch_admin', 'super_admin', 'manager'), controller.triggerRecalculate);

export default router;

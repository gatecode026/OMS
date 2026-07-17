/**
 * @file src/modules/work-reports/work-reports.routes.js
 * @description Routes for WorkReports module.
 */

import express from 'express';
import controller from './work-reports.controller.js';
import validation from './work-reports.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes placeholder
router.get('/public', controller.getPublicData);

// Secured routes boundary
router.use(authenticate);

// Check for existing report (must be before /:id to avoid route conflicts)
router.get('/check', controller.checkExisting);

router.route('/')
  .get(controller.getAll)
  .post(validateRequest(validation.create), controller.create);

router.route('/:id')
  .get(controller.getById)
  .put(validateRequest(validation.update), controller.update)
  .delete(restrictTo('super_admin'), controller.remove);

export default router;

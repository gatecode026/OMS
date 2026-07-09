/**
 * @file src/modules/employees/employees.routes.js
 * @description Routes for Employees module.
 */

import express from 'express';
import controller from './employees.controller.js';
import validation from './employees.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, restrictTo, checkPermission } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes placeholder
router.get('/public', controller.getPublicData);

// Secured routes boundary
router.use(authenticate);

router.route('/')
  .get(controller.getAll)
  .post(validateRequest(validation.create), controller.create);

router.route('/:id')
  .get(controller.getById)
  .put(validateRequest(validation.update), controller.update)
  .delete(restrictTo('super_admin'), controller.remove);

router.get('/:id/open-work', checkPermission('Employees', 'read'), controller.getOpenWork);
router.post('/:id/deactivate', checkPermission('Employees', 'delete'), controller.deactivate);
router.post('/:id/restore', checkPermission('Employees', 'delete'), controller.restore);

export default router;

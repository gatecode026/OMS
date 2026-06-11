/**
 * @file src/modules/roles/roles.routes.js
 * @description Routes for Roles module.
 */

import express from 'express';
import controller from './roles.controller.js';
import validation from './roles.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes placeholder
router.get('/public', controller.getPublicData);

// Secured routes boundary
router.use(authenticate);

router.route('/')
  .get(controller.getAll)
  .post(validateRequest(validation.create), controller.create);

router.route('/overrides')
  .get(controller.getAllOverrides)
  .post(controller.createOverride);

router.route('/overrides/:id')
  .delete(restrictTo('super_admin'), controller.deleteOverride);

router.route('/permissions-modules')
  .get(controller.getAllPermissionModules)
  .post(controller.createPermissionModule);

router.route('/permissions-modules/:key')
  .delete(restrictTo('super_admin'), controller.deletePermissionModule);

router.route('/:id')
  .get(controller.getById)
  .put(validateRequest(validation.update), controller.update)
  .delete(restrictTo('super_admin'), controller.remove);

export default router;

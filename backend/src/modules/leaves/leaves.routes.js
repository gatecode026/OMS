/**
 * @file src/modules/leaves/leaves.routes.js
 * @description Routes for Leaves module.
 */

import express from 'express';
import controller from './leaves.controller.js';
import validation from './leaves.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes placeholder
router.get('/public', controller.getPublicData);

// Secured routes boundary
router.use(authenticate);

router.route('/policies')
  .get(controller.getAllPolicies)
  .post(controller.createPolicy);

router.route('/policies/reset')
  .post(controller.resetPolicies);

router.route('/policies/:id')
  .put(controller.updatePolicy)
  .delete(controller.removePolicy);

router.route('/')
  .get(controller.getAll)
  .post(validateRequest(validation.create), controller.create);

router.route('/:id')
  .get(controller.getById)
  .put(validateRequest(validation.update), controller.update)
  .delete(restrictTo('super_admin'), controller.remove);

export default router;

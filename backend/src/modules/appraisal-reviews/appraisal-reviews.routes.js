/**
 * @file src/modules/appraisal-reviews/appraisal-reviews.routes.js
 * @description Routes for Appraisal Reviews module.
 */

import express from 'express';
import controller from './appraisal-reviews.controller.js';
import validation from './appraisal-reviews.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Secured routes boundary
router.use(authenticate);

router.route('/')
  .get(controller.getAll)
  .post(validateRequest(validation.create), controller.create);

router.route('/:id')
  .get(controller.getById)
  .delete(restrictTo('super_admin'), controller.remove);

export default router;

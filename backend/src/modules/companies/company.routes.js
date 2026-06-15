import express from 'express';
import controller from './company.controller.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
  .post(authenticate, restrictTo('super_admin'), controller.create)
  .get(authenticate, restrictTo('super_admin'), controller.getAll);

router.route('/:id')
  .get(authenticate, restrictTo('super_admin', 'company_admin'), controller.getById)
  .put(authenticate, restrictTo('super_admin', 'company_admin'), controller.update);

router.patch('/:id/status', authenticate, restrictTo('super_admin'), controller.setStatus);

export default router;

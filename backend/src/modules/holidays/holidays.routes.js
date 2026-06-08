/**
 * @file src/modules/holidays/holidays.routes.js
 * @description Routes for Holidays module.
 */

import express from 'express';
import controller from './holidays.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(controller.getAll)
  .post(controller.create);

router.route('/:id')
  .delete(controller.remove);

export default router;

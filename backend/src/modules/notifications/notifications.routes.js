/**
 * @file src/modules/notifications/notifications.routes.js
 * @description Routes for Notifications module.
 */

import express from 'express';
import controller from './notifications.controller.js';
import * as pushNotificationController from './pushNotificationController.js';
import validation from './notifications.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes placeholder
router.get('/public', controller.getPublicData);

// Secured routes boundary
router.use(authenticate);

// ─── WEB PUSH NOTIFICATIONS ──────────────────────────────────────────────────
router.get('/push/key', pushNotificationController.getPublicKey);
router.post('/push/subscribe', pushNotificationController.subscribe);
router.post('/push/unsubscribe', pushNotificationController.unsubscribe);

router.route('/')
  .get(controller.getAll)
  .post(validateRequest(validation.create), controller.create);

router.route('/:id')
  .get(controller.getById)
  .put(validateRequest(validation.update), controller.update)
  .delete(restrictTo('super_admin'), controller.remove);

export default router;

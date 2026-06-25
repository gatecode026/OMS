/**
 * @file src/modules/notifications/notifications.routes.js
 * @description Routes for the Enterprise Notification Engine.
 *
 *   All routes require authentication.
 *
 *   Public:
 *     GET  /public
 *
 *   Notification CRUD:
 *     GET    /                     → list (paginated, filterable by category)
 *     POST   /                     → create / broadcast (broadcast requires admin role)
 *     GET    /unread-count          → Redis-first unread badge count
 *     PATCH  /read-all              → mark all as read + reset counter
 *     PATCH  /:id/read              → mark single as read
 *     DELETE /:id                   → delete notification (user-scoped)
 *
 *   Preferences:
 *     GET  /preferences             → get user notification preferences
 *     PUT  /preferences             → save user notification preferences
 *
 *   Web Push:
 *     GET  /push/key                → VAPID public key
 *     POST /push/subscribe          → register push subscription
 *     POST /push/unsubscribe        → remove push subscription
 */

import express from 'express';
import controller from './notifications.controller.js';
import * as pushNotificationController from './pushNotificationController.js';
import validation from './notifications.validation.js';
import { validateRequest } from '../../middlewares/validation.middleware.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// ── PUBLIC ────────────────────────────────────────────────────────────────────
router.get('/public', controller.getPublicData);

// ── AUTH BOUNDARY ─────────────────────────────────────────────────────────────
router.use(authenticate);

// ── WEB PUSH ──────────────────────────────────────────────────────────────────
router.get('/push/key', pushNotificationController.getPublicKey);
router.post('/push/subscribe', pushNotificationController.subscribe);
router.post('/push/unsubscribe', pushNotificationController.unsubscribe);

// ── PREFERENCES ───────────────────────────────────────────────────────────────
router.route('/preferences')
  .get(controller.getPreferences)
  .put(controller.savePreferences);

// ── AGGREGATE ACTIONS ─────────────────────────────────────────────────────────
router.get('/unread-count', controller.getUnreadCount);
router.patch('/read-all', controller.markAllRead);

// ── BROADCAST (admin only) ────────────────────────────────────────────────────
router.post('/broadcast', restrictTo('admin', 'super_admin'), controller.broadcastAnnouncement);

// ── COLLECTION ────────────────────────────────────────────────────────────────
router.route('/')
  .get(controller.getAll)
  .post(validateRequest(validation.create), controller.create);

// ── INDIVIDUAL NOTIFICATION ───────────────────────────────────────────────────
router.patch('/:id/read', controller.markRead);
router.delete('/:id', controller.deleteNotification);

// Generic CRUD (backwards compat)
router.route('/:id')
  .get(controller.getById)
  .put(validateRequest(validation.update), controller.update);

export default router;

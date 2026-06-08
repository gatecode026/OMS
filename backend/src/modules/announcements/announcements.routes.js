/**
 * @file src/modules/announcements/announcements.routes.js
 * @description Router configuration mapping REST paths to controller handlers.
 */

import express from 'express';
import controller from './announcements.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

// Emergency Alert Endpoint
router.route('/emergency')
  .get(controller.getEmergency)
  .post(controller.updateEmergency);

// Tracking Logs and Audit Logs endpoints
router.route('/tracking')
  .get(controller.getTracking);

router.route('/audit-logs')
  .get(controller.getAudit);

// Core Announcement CRUD Endpoints
router.route('/')
  .get(controller.getAll)
  .post(controller.create);

router.route('/:id')
  .put(controller.update)
  .delete(controller.remove);

// View action logging
router.route('/:id/view')
  .post(controller.logView);

// Interaction endpoints
router.route('/:id/acknowledge')
  .post(controller.acknowledge);

router.route('/:id/like')
  .post(controller.like);

// Discussion board endpoints
router.route('/:id/comment')
  .post(controller.addComment);

router.route('/:id/comment/:commentId')
  .delete(controller.deleteComment);

export default router;

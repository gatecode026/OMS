/**
 * @file src/modules/events/event.routes.js
 * @description Route registrations for Event / Meeting resources.
 */

import express from 'express';
import controller from './event.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Secure all endpoints under this router
router.use(authenticate);

// Query / range and creation routes
router.route('/')
  .get(controller.getEvents)
  .post(controller.createEvent);

// Upcoming events list
router.get('/upcoming', controller.getUpcomingEvents);

// Event statistics counts
router.get('/stats', controller.getEventStats);

// Individual event modification and deletion routes
router.route('/:id')
  .patch(controller.updateEvent)
  .delete(controller.deleteEvent);

export default router;

/**
 * @file src/controllers/eventController.js
 * @description Compatibility export wrapper for Event controller functions.
 */

import controller from '../modules/events/event.controller.js';

export const getEvents = controller.getEvents;
export const getUpcomingEvents = controller.getUpcomingEvents;
export const getEventStats = controller.getEventStats;
export const createEvent = controller.createEvent;
export const updateEvent = controller.updateEvent;
export const deleteEvent = controller.deleteEvent;

export default controller;

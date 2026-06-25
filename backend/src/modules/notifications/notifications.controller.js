/**
 * @file src/modules/notifications/notifications.controller.js
 * @description REST controllers for the Enterprise Notification Engine.
 *
 *   Endpoints:
 *     GET    /api/notifications                    → paginated list with category filter
 *     GET    /api/notifications/unread-count        → current unread badge count
 *     PATCH  /api/notifications/read-all            → mark all as read
 *     PATCH  /api/notifications/:id/read            → mark single as read
 *     DELETE /api/notifications/:id                 → delete notification
 *     GET    /api/notifications/preferences         → get user preferences
 *     PUT    /api/notifications/preferences         → save user preferences
 */

import service from './notifications.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getIO } from '../../config/socket.js';
import logger from '../../config/logger.js';

// ── LIST ──────────────────────────────────────────────────────────────────────

export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50); // Cap at 50
  const categoryFilter = req.query.category || req.query.type || null;

  const data = await service.getNotifications(
    req.user.id,
    req.user.companyId,
    page,
    limit,
    categoryFilter
  );
  return successResponse(res, data, 'Notifications fetched successfully');
});

// ── UNREAD COUNT ──────────────────────────────────────────────────────────────

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await service.getUnreadCount(req.user.id, req.user.companyId);
  return successResponse(res, { count }, 'Unread count fetched successfully');
});

// ── MARK READ ─────────────────────────────────────────────────────────────────

export const markRead = asyncHandler(async (req, res) => {
  const data = await service.markAsRead(req.params.id, req.user.id, req.user.companyId);
  if (!data) {
    return successResponse(res, null, 'Notification already read or not found');
  }

  // Emit updated unread count via Socket.IO
  try {
    const newCount = await service.getUnreadCount(req.user.id, req.user.companyId);
    const io = getIO();
    io.to(`user:${req.user.id}`).emit('notification:unread_count', { count: newCount });
  } catch (err) {
    logger.debug('[Notification Controller] Could not emit updated unread count:', err.message);
  }

  return successResponse(res, data, 'Notification marked as read');
});

export const markAllRead = asyncHandler(async (req, res) => {
  const data = await service.markAllAsRead(req.user.id, req.user.companyId);

  // Emit reset event via Socket.IO
  try {
    const io = getIO();
    io.to(`user:${req.user.id}`).emit('notification:unread_reset');
  } catch (err) {
    logger.debug('[Notification Controller] Could not emit unread reset:', err.message);
  }

  return successResponse(res, data, 'All notifications marked as read');
});

// ── DELETE ────────────────────────────────────────────────────────────────────

export const deleteNotification = asyncHandler(async (req, res) => {
  const doc = await service.deleteNotification(req.params.id, req.user.id, req.user.companyId);
  if (!doc) {
    return successResponse(res, null, 'Notification not found or access denied');
  }
  return successResponse(res, { id: req.params.id }, 'Notification deleted');
});

// ── PREFERENCES ───────────────────────────────────────────────────────────────

export const getPreferences = asyncHandler(async (req, res) => {
  const prefs = await service.getUserPreferences(req.user.id);
  return successResponse(res, prefs, 'Preferences fetched successfully');
});

export const savePreferences = asyncHandler(async (req, res) => {
  const updated = await service.saveUserPreferences(req.user.id, req.body);
  return successResponse(res, updated, 'Preferences saved successfully');
});

// ── BROADCAST (Admin only) ────────────────────────────────────────────────────

export const broadcastAnnouncement = asyncHandler(async (req, res) => {
  const data = await service.broadcastAnnouncement(
    req.user.companyId,
    req.user.id,
    req.body.title,
    req.body.message,
    req.body.data || {}
  );
  return successResponse(res, data, 'Broadcast announcement sent', 201);
});

// ── GENERIC CRUD (backwards compat) ──────────────────────────────────────────

export const getById = asyncHandler(async (req, res) => {
  const data = await service.findById(req.params.id);
  return successResponse(res, data, 'Record fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  if (req.body.broadcast) {
    const data = await service.broadcastAnnouncement(
      req.user.companyId,
      req.user.id,
      req.body.title,
      req.body.message,
      req.body.data || {}
    );
    return successResponse(res, data, 'Broadcast announcement sent', 201);
  }
  const data = await service.createRecord(req.body, req.user);
  return successResponse(res, data, 'Record created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.updateRecord(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Record updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const data = await service.deleteRecord(req.params.id, req.user);
  return successResponse(res, data, 'Record deleted successfully');
});

export const getPublicData = asyncHandler(async (req, res) => {
  return successResponse(res, { status: 'ok' }, 'Public data');
});

export default {
  getAll,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  savePreferences,
  broadcastAnnouncement,
  getById,
  create,
  update,
  remove,
  getPublicData,
};

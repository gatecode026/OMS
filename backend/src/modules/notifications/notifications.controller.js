/**
 * @file src/modules/notifications/notifications.controller.js
 * @description Controllers for Notifications module REST endpoints.
 */

import service from './notifications.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const typeFilter = req.query.type || null;

  const data = await service.getNotifications(req.user.id, req.user.companyId, page, limit, typeFilter);
  return successResponse(res, data, 'Notifications fetched successfully');
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await service.getUnreadCount(req.user.id, req.user.companyId);
  return successResponse(res, { count }, 'Unread count fetched successfully');
});

export const markRead = asyncHandler(async (req, res) => {
  const data = await service.markAsRead(req.params.id, req.user.id, req.user.companyId);
  return successResponse(res, data, 'Notification marked as read successfully');
});

export const markAllRead = asyncHandler(async (req, res) => {
  const data = await service.markAllAsRead(req.user.id, req.user.companyId);
  return successResponse(res, data, 'All notifications marked as read successfully');
});

export const getById = asyncHandler(async (req, res) => {
  const data = await service.findById(req.params.id);
  return successResponse(res, data, 'Record fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  // Supports direct creation/broadcasting
  if (req.body.broadcast && req.user.roleId === 'super_admin') {
    const data = await service.broadcastAnnouncement(req.user.companyId, req.user.id, req.body.title, req.body.message, req.body.data || {});
    return successResponse(res, data, 'Broadcast announcement sent successfully', 201);
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
  return successResponse(res, { status: 'mock_public_data' }, 'Public record fetched');
});

export default {
  getAll,
  getUnreadCount,
  markRead,
  markAllRead,
  getById,
  create,
  update,
  remove,
  getPublicData
};

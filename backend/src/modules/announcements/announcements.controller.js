/**
 * @file src/modules/announcements/announcements.controller.js
 * @description Controllers for Announcements module.
 */

import service from './announcements.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query);
  return successResponse(res, data, 'Announcements fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.createRecord(req.body, req.user);
  return successResponse(res, data, 'Announcement created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.updateRecord(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Announcement updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const data = await service.deleteRecord(req.params.id, req.user);
  return successResponse(res, data, 'Announcement deleted successfully');
});

export const acknowledge = asyncHandler(async (req, res) => {
  const data = await service.acknowledgeNotice(req.params.id, req.user.id, req.user);
  return successResponse(res, data, 'Policy acknowledged successfully');
});

export const like = asyncHandler(async (req, res) => {
  const data = await service.likeNotice(req.params.id, req.user.id);
  return successResponse(res, data, 'Notice reaction updated successfully');
});

export const addComment = asyncHandler(async (req, res) => {
  const data = await service.addComment(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Comment posted successfully', 201);
});

export const deleteComment = asyncHandler(async (req, res) => {
  const data = await service.deleteComment(req.params.id, req.params.commentId, req.user);
  return successResponse(res, data, 'Comment deleted successfully');
});

export const getEmergency = asyncHandler(async (req, res) => {
  const data = await service.getEmergencyAlert();
  return successResponse(res, data, 'Emergency alert state fetched');
});

export const updateEmergency = asyncHandler(async (req, res) => {
  const data = await service.updateEmergencyAlert(req.body, req.user);
  return successResponse(res, data, 'Emergency alert broadcasted');
});

export const getTracking = asyncHandler(async (req, res) => {
  const data = await service.getTrackingLogs();
  return successResponse(res, data, 'Compliance tracking logs fetched');
});

export const getAudit = asyncHandler(async (req, res) => {
  const data = await service.getAuditLogs();
  return successResponse(res, data, 'Communications audit trail fetched');
});

export const logView = asyncHandler(async (req, res) => {
  const data = await service.logNoticeView(req.params.id, req.user.id, req.user);
  return successResponse(res, data, 'Announcement view logged');
});

export default {
  getAll,
  create,
  update,
  remove,
  acknowledge,
  like,
  addComment,
  deleteComment,
  getEmergency,
  updateEmergency,
  getTracking,
  getAudit,
  logView
};

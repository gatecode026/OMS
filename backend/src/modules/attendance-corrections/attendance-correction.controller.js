/**
 * @file src/modules/attendance-corrections/attendance-correction.controller.js
 * @description Controller actions for Attendance Corrections.
 */

import service from './attendance-correction.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query);
  return successResponse(res, data, 'Correction requests fetched successfully');
});

export const getById = asyncHandler(async (req, res) => {
  const data = await service.findById(req.params.id);
  return successResponse(res, data, 'Correction request fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.createRequest(req.body, req.user);
  return successResponse(res, data, 'Correction request submitted successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.updateRequest(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Correction request updated successfully');
});

export const approve = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const data = await service.approveRequest(req.params.id, comments, req.user);
  return successResponse(res, data, 'Correction request approved successfully');
});

export const reject = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const data = await service.rejectRequest(req.params.id, comments, req.user);
  return successResponse(res, data, 'Correction request rejected successfully');
});

export const moreInfo = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const data = await service.requestMoreInfo(req.params.id, comments, req.user);
  return successResponse(res, data, 'Information request sent successfully');
});

export default {
  getAll,
  getById,
  create,
  update,
  approve,
  reject,
  moreInfo
};

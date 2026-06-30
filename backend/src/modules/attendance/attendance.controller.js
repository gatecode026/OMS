/**
 * @file src/modules/attendance/attendance.controller.js
 * @description Controllers for Attendance module.
 */

import service from './attendance.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query);
  return successResponse(res, data, 'Records fetched successfully');
});

export const getById = asyncHandler(async (req, res) => {
  const data = await service.findById(req.params.id);
  return successResponse(res, data, 'Record fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
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

export const getToday = asyncHandler(async (req, res) => {
  const employeeId = req.query.employeeId || req.user.id;
  const data = await service.findToday(employeeId);
  return successResponse(res, data, 'Today record fetched successfully');
});

export const getSummary = asyncHandler(async (req, res) => {
  const employeeId = req.query.employeeId || req.user.id;
  const month = req.query.month;
  const data = await service.findSummary(employeeId, month);
  return successResponse(res, data, 'Summary fetched successfully');
});

export const qrPunch = asyncHandler(async (req, res) => {
  const { employeeId, companyId } = req.body;

  if (!employeeId || !companyId) {
    return res.status(400).json({ success: false, message: 'employeeId and companyId are required' });
  }

  // Tenant boundary verification
  if (req.user && req.user.role !== 'super_admin' && req.user.companyId !== companyId) {
    return res.status(403).json({ success: false, message: 'Access denied: Tenant mismatch' });
  }

  const result = await service.qrPunch(employeeId, companyId);
  return successResponse(res, result, result.message);
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getPublicData,
  getToday,
  getSummary,
  qrPunch
};

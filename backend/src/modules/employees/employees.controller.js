/**
 * @file src/modules/employees/employees.controller.js
 * @description Controllers for Employees module.
 */

import service from './employees.service.js';
import * as exitService from './exit.service.js';
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

export const getOpenWork = asyncHandler(async (req, res) => {
  const data = await exitService.getOpenWork(req.params.id);
  return successResponse(res, data, 'Pending work checked successfully');
});

export const deactivate = asyncHandler(async (req, res) => {
  const data = await exitService.deactivate(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Employee deactivated and work reassigned successfully');
});

export const restore = asyncHandler(async (req, res) => {
  const data = await exitService.restore(req.params.id, req.user);
  return successResponse(res, data, 'Employee restored successfully');
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getPublicData,
  getOpenWork,
  deactivate,
  restore
};

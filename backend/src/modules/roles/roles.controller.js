/**
 * @file src/modules/roles/roles.controller.js
 * @description Controllers for Roles and Permission Modules.
 */

import service from './roles.service.js';
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

export const getAllOverrides = asyncHandler(async (req, res) => {
  const data = await service.findAllOverrides(req.query);
  return successResponse(res, data, 'Overrides fetched successfully');
});

export const createOverride = asyncHandler(async (req, res) => {
  const data = await service.createOverrideRecord(req.body, req.user);
  return successResponse(res, data, 'Override created successfully', 201);
});

export const deleteOverride = asyncHandler(async (req, res) => {
  const data = await service.deleteOverrideRecord(req.params.id, req.user);
  return successResponse(res, data, 'Override deleted successfully');
});

export const getPublicData = asyncHandler(async (req, res) => {
  return successResponse(res, { status: 'mock_public_data' }, 'Public record fetched');
});

// --- Permission Modules ---

export const getAllPermissionModules = asyncHandler(async (req, res) => {
  const data = await service.findAllPermissionModules(req.query);
  return successResponse(res, data, 'Permission modules fetched successfully');
});

export const createPermissionModule = asyncHandler(async (req, res) => {
  const data = await service.createPermissionModule(req.body, req.user);
  return successResponse(res, data, 'Permission module created successfully', 201);
});

export const deletePermissionModule = asyncHandler(async (req, res) => {
  const data = await service.deletePermissionModule(req.params.key, req.user);
  return successResponse(res, data, 'Permission module deleted successfully');
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getAllOverrides,
  createOverride,
  deleteOverride,
  getPublicData,
  getAllPermissionModules,
  createPermissionModule,
  deletePermissionModule
};

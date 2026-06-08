/**
 * @file src/modules/leaves/leaves.controller.js
 * @description Controllers for Leaves module.
 */

import service from './leaves.service.js';
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

export const getAllPolicies = asyncHandler(async (req, res) => {
  const data = await service.findAllPolicies();
  return successResponse(res, data, 'Policies fetched successfully');
});

export const createPolicy = asyncHandler(async (req, res) => {
  const data = await service.createPolicyRecord(req.body, req.user);
  return successResponse(res, data, 'Policy created successfully', 201);
});

export const updatePolicy = asyncHandler(async (req, res) => {
  const data = await service.updatePolicyRecord(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Policy updated successfully');
});

export const removePolicy = asyncHandler(async (req, res) => {
  const data = await service.deletePolicyRecord(req.params.id, req.user);
  return successResponse(res, data, 'Policy deleted successfully');
});

export const resetPolicies = asyncHandler(async (req, res) => {
  const data = await service.resetPolicyRecords(req.user);
  return successResponse(res, data, 'Policies reset to default successfully');
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getPublicData,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  removePolicy,
  resetPolicies
};

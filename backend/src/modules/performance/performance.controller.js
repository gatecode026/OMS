/**
 * @file src/modules/performance/performance.controller.js
 * @description Controllers for Goals and PIPs.
 */

import service from './performance.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// --- GOALS CONTROLLERS ---
export const getGoals = asyncHandler(async (req, res) => {
  const data = await service.findAllGoals(req.query);
  return successResponse(res, data, 'Goals fetched successfully');
});

export const postGoal = asyncHandler(async (req, res) => {
  const data = await service.createGoal(req.body);
  return successResponse(res, data, 'Goal created successfully', 201);
});

export const putGoal = asyncHandler(async (req, res) => {
  const data = await service.updateGoal(req.params.id, req.body);
  return successResponse(res, data, 'Goal updated successfully');
});

export const deleteGoal = asyncHandler(async (req, res) => {
  const data = await service.deleteGoal(req.params.id);
  return successResponse(res, data, 'Goal deleted successfully');
});

// --- PIPS CONTROLLERS ---
export const getPips = asyncHandler(async (req, res) => {
  const data = await service.findAllPips(req.query);
  return successResponse(res, data, 'PIPs fetched successfully');
});

export const postPip = asyncHandler(async (req, res) => {
  const data = await service.createPip(req.body);
  return successResponse(res, data, 'PIP created successfully', 201);
});

export const putPip = asyncHandler(async (req, res) => {
  const data = await service.updatePip(req.params.id, req.body);
  return successResponse(res, data, 'PIP updated successfully');
});

export const deletePip = asyncHandler(async (req, res) => {
  const data = await service.deletePip(req.params.id);
  return successResponse(res, data, 'PIP deleted successfully');
});

export default {
  getGoals,
  postGoal,
  putGoal,
  deleteGoal,
  getPips,
  postPip,
  putPip,
  deletePip
};

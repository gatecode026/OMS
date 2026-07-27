/**
 * @file src/modules/kpi/kpi-evaluation-cycles/kpi-evaluation-cycle.controller.js
 * @description Controllers for KPI Evaluation Cycles.
 */

import service from './kpi-evaluation-cycle.service.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const getCycles = asyncHandler(async (req, res) => {
  const data = await service.findAllCycles(req.query);
  return successResponse(res, data, 'KPI Cycles fetched successfully');
});

export const getCycleById = asyncHandler(async (req, res) => {
  const data = await service.findCycleById(req.params.id);
  if (!data) {
    return res.status(404).json({ status: 'fail', message: 'KPI Cycle not found' });
  }
  return successResponse(res, data, 'KPI Cycle fetched successfully');
});

export const postCycle = asyncHandler(async (req, res) => {
  const data = await service.createCycle(req.body, req.user);
  return successResponse(res, data, 'KPI Cycle started successfully', 201);
});

export const postSubmit = asyncHandler(async (req, res) => {
  const data = await service.submitCycle(req.params.id, req.user);
  return successResponse(res, data, 'KPI Cycle submitted successfully');
});

export const postApprove = asyncHandler(async (req, res) => {
  const data = await service.approveCycle(req.params.id, req.user);
  return successResponse(res, data, 'KPI Cycle approved successfully');
});

export const postLock = asyncHandler(async (req, res) => {
  const data = await service.lockCycle(req.params.id, req.user);
  return successResponse(res, data, 'KPI Cycle locked successfully');
});

export default {
  getCycles,
  getCycleById,
  postCycle,
  postSubmit,
  postApprove,
  postLock
};

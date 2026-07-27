/**
 * @file src/modules/kpi/kpi-employee-evaluations/kpi-employee-evaluation.controller.js
 * @description Controllers for KPI Employee Evaluations.
 */

import service from './kpi-employee-evaluation.service.js';
import { successResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

export const getEvaluations = asyncHandler(async (req, res) => {
  const data = await service.findAllEvaluations(req.query);
  return successResponse(res, data, 'KPI Employee Evaluations fetched successfully');
});

export const getEvaluationById = asyncHandler(async (req, res) => {
  const data = await service.findEvaluationById(req.params.id);
  if (!data) {
    return res.status(404).json({ status: 'fail', message: 'KPI Employee Evaluation not found' });
  }
  return successResponse(res, data, 'KPI Employee Evaluation fetched successfully');
});

export const getEvaluationsByEmployee = asyncHandler(async (req, res) => {
  const data = await service.findAllEvaluations({ employeeId: req.params.employeeId });
  return successResponse(res, data, 'KPI Employee Evaluations for employee fetched successfully');
});

export const getEvaluationsByCycle = asyncHandler(async (req, res) => {
  const data = await service.findAllEvaluations({ cycleId: req.params.cycleId });
  return successResponse(res, data, 'KPI Employee Evaluations for cycle fetched successfully');
});

export const patchScores = asyncHandler(async (req, res) => {
  const data = await service.updateScoresAndComments(req.params.id, req.body, req.user);
  return successResponse(res, data, 'KPI Employee Evaluation scores updated successfully');
});

export const postRefreshAutoScores = asyncHandler(async (req, res) => {
  const data = await service.refreshAutoScores(req.params.id, req.user);
  return successResponse(res, data, 'KPI Employee Evaluation scores refreshed successfully');
});

export const postSubmit = asyncHandler(async (req, res) => {
  const data = await service.submitEvaluation(req.params.id, req.user);
  return successResponse(res, data, 'KPI Employee Evaluation submitted successfully');
});

export const postReturn = asyncHandler(async (req, res) => {
  const data = await service.returnEvaluation(req.params.id, req.body.returnReason, req.user);
  return successResponse(res, data, 'KPI Employee Evaluation returned successfully');
});

export const postApprove = asyncHandler(async (req, res) => {
  const data = await service.approveEvaluation(req.params.id, req.user);
  return successResponse(res, data, 'KPI Employee Evaluation approved successfully');
});

export const postLock = asyncHandler(async (req, res) => {
  const data = await service.lockEvaluation(req.params.id, req.user);
  return successResponse(res, data, 'KPI Employee Evaluation locked successfully');
});

export const postReopen = asyncHandler(async (req, res) => {
  const data = await service.reopenEvaluation(req.params.id, req.body.reopenReason, req.user);
  return successResponse(res, data, 'KPI Employee Evaluation reopened successfully');
});

export default {
  getEvaluations,
  getEvaluationById,
  getEvaluationsByEmployee,
  getEvaluationsByCycle,
  patchScores,
  postRefreshAutoScores,
  postSubmit,
  postReturn,
  postApprove,
  postLock,
  postReopen
};

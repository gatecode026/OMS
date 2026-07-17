/**
 * @file src/modules/payroll-queries/payroll-query.controller.js
 * @description Controllers for Payroll Queries disputes.
 */

import * as service from './payroll-query.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAllQueries = asyncHandler(async (req, res) => {
  const data = await service.getQueries(req.query);
  return successResponse(res, data, 'Payroll queries fetched successfully');
});

export const getQueryById = asyncHandler(async (req, res) => {
  const data = await service.getQueryDetails(req.params.id);
  return successResponse(res, data, 'Payroll query details fetched successfully');
});

export const createDispute = asyncHandler(async (req, res) => {
  const data = await service.createDispute(req.body, req.user);
  return successResponse(res, data, 'Dispute query submitted successfully', 201);
});

export const postComment = asyncHandler(async (req, res) => {
  const data = await service.postComment(req.params.id, req.user, req.body);
  return successResponse(res, data, 'Comment posted successfully');
});

export const postInternalNote = asyncHandler(async (req, res) => {
  const data = await service.postInternalNote(
    req.params.id,
    req.user.name,
    req.body.note,
    req.user.id
  );
  return successResponse(res, data, 'Internal note saved successfully');
});

export const processHRAction = asyncHandler(async (req, res) => {
  const { action, comments } = req.body;
  const data = await service.processHRAction(
    req.params.id,
    action,
    req.user,
    comments,
    req.user.companyId
  );
  return successResponse(res, data, 'Action processed successfully');
});

export const triggerRecalculate = asyncHandler(async (req, res) => {
  const data = await service.recalculatePayrollRecord(req.params.payrollId, req.user.companyId, req.body);
  return successResponse(res, data, 'Payroll record recalculated successfully');
});

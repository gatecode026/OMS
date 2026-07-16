/**
 * @file src/modules/work-reports/work-reports.controller.js
 * @description Controllers for WorkReports module.
 */

import service from './work-reports.service.js';
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

/**
 * Check if a report already exists for a given employee + date.
 * GET /work-reports/check?employeeId=X&date=YYYY-MM-DD
 */
export const checkExisting = asyncHandler(async (req, res) => {
  const { employeeId, date } = req.query;
  if (!employeeId || !date) {
    return res.status(400).json({
      status: 'error',
      message: 'employeeId and date query parameters are required.'
    });
  }
  const existing = await service.findByEmployeeAndDate(employeeId, date);
  return successResponse(res, existing || null, existing ? 'Existing report found' : 'No existing report');
});

export const create = asyncHandler(async (req, res) => {
  try {
    const data = await service.createRecord(req.body, req.user);
    return successResponse(res, data, 'Record created successfully', 201);
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({
        status: 'error',
        message: err.message,
        existingReport: err.existingReport || null
      });
    }
    if (err.statusCode === 400) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
    throw err;
  }
});

export const update = asyncHandler(async (req, res) => {
  try {
    const data = await service.updateRecord(req.params.id, req.body, req.user);
    return successResponse(res, data, 'Record updated successfully');
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        status: 'error',
        message: err.message
      });
    }
    if (err.statusCode === 400) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({
        status: 'error',
        message: err.message
      });
    }
    throw err;
  }
});

export const remove = asyncHandler(async (req, res) => {
  try {
    const data = await service.deleteRecord(req.params.id, req.user);
    return successResponse(res, data, 'Record deleted successfully');
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({
        status: 'error',
        message: err.message
      });
    }
    throw err;
  }
});

export const getPublicData = asyncHandler(async (req, res) => {
  return successResponse(res, { status: 'mock_public_data' }, 'Public record fetched');
});

export default {
  getAll,
  getById,
  checkExisting,
  create,
  update,
  remove,
  getPublicData
};

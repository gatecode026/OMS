/**
 * @file src/modules/analytics/analytics.controller.js
 * @description Controller for Analytics module endpoints.
 */

import asyncHandler from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/response.js';
import analyticsService from './analytics.service.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardSummary(req.user);
  return successResponse(res, data, 'Dashboard summary fetched successfully');
});

export const getPerformance = asyncHandler(async (req, res) => {
  const period = req.query.period || 'yearly';
  const data = await analyticsService.getPerformanceOverview(period, req.user);
  return successResponse(res, data, 'Performance overview fetched successfully');
});

export const getDepartments = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDepartmentAnalytics(req.user);
  return successResponse(res, data, 'Department analytics fetched successfully');
});

export const getReports = asyncHandler(async (req, res) => {
  const category = req.query.category || 'All';
  const data = await analyticsService.getRecentReports(category, req.user);
  return successResponse(res, data, 'Recent reports fetched successfully');
});

export const search = asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const data = await analyticsService.searchAnalytics(q, req.user);
  return successResponse(res, data, 'Analytics search completed successfully');
});

export const refresh = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardSummary(req.user);
  return successResponse(res, data, 'Analytics metrics recalculated successfully');
});

export default {
  getDashboard,
  getPerformance,
  getDepartments,
  getReports,
  search,
  refresh,
};

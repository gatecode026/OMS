/**
 * @file src/modules/payroll/payroll.controller.js
 * @description Controllers mapping HTTP routes to Payroll services.
 */

import service from './payroll.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getMasterData = asyncHandler(async (req, res) => {
  const data = await service.getMasterPayrollData(req.user);
  return successResponse(res, data, 'Master payroll data fetched successfully');
});

export const saveSalaryGrade = asyncHandler(async (req, res) => {
  const data = await service.saveGrade(req.body, req.user);
  return successResponse(res, data, 'Salary grade saved successfully');
});

export const deleteSalaryGrade = asyncHandler(async (req, res) => {
  const data = await service.deleteGrade(req.params.id, req.user);
  return successResponse(res, data, 'Salary grade deleted successfully');
});

export const createLoanAdvance = asyncHandler(async (req, res) => {
  const data = await service.createLoanAdvance(req.body, req.user);
  return successResponse(res, data, 'Loan or Advance record created successfully', 201);
});

export const updateLoanAdvanceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = await service.updateLoanAdvanceStatus(id, status, req.user);
  return successResponse(res, data, 'Loan/Advance status updated successfully');
});

export const recommendBonus = asyncHandler(async (req, res) => {
  const data = await service.createBonus(req.body, req.user);
  return successResponse(res, data, 'Bonus recommendation submitted successfully', 201);
});

export const updateBonusStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = await service.updateBonusStatus(id, status, req.user);
  return successResponse(res, data, 'Bonus status updated successfully');
});

export const updateReimbursementStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = await service.updateReimbursementStatus(id, status, req.user);
  return successResponse(res, data, 'Reimbursement status updated successfully');
});

export const saveMonthlyPayment = asyncHandler(async (req, res) => {
  const data = await service.saveMonthlyPayment(req.body, req.user);
  return successResponse(res, data, 'Monthly payment record saved successfully');
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { empId } = req.params;
  const { month, year, status } = req.body;
  const data = await service.updatePaymentStatus(empId, month, year, status, req.user);
  return successResponse(res, data, 'Payment status updated successfully');
});

export const bulkUpdatePaymentStatus = asyncHandler(async (req, res) => {
  const { month, year, status } = req.body;
  const data = await service.bulkUpdatePaymentStatus(month, year, status, req.user);
  return successResponse(res, data, 'Bulk payment statuses updated successfully');
});

export const saveGlobalConfigs = asyncHandler(async (req, res) => {
  const data = await service.saveGlobalConfigs(req.body, req.user);
  return successResponse(res, data, 'Global payroll configuration updated successfully');
});

export const resetPaymentDeductions = asyncHandler(async (req, res) => {
  const data = await service.resetPaymentDeductions(req.body, req.user);
  return successResponse(res, data, 'Payment deductions reset successfully');
});

export default {
  getMasterData,
  saveSalaryGrade,
  deleteSalaryGrade,
  createLoanAdvance,
  updateLoanAdvanceStatus,
  recommendBonus,
  updateBonusStatus,
  updateReimbursementStatus,
  saveMonthlyPayment,
  updatePaymentStatus,
  bulkUpdatePaymentStatus,
  saveGlobalConfigs,
  resetPaymentDeductions
};

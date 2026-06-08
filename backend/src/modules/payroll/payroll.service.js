/**
 * @file src/modules/payroll/payroll.service.js
 * @description Service business logic wrapper for Payroll module.
 */

import repository from './payroll.repository.js';
import logger from '../../config/logger.js';

export const getMasterPayrollData = async () => {
  logger.info('Executing PayrollService::getMasterPayrollData');
  return repository.getMasterPayrollData();
};

export const saveGrade = async (gradeData, currentUser) => {
  logger.info(`Executing PayrollService::saveGrade by user: ${currentUser?.id}`);
  return repository.saveGrade(gradeData);
};

export const deleteGrade = async (id, currentUser) => {
  logger.info(`Executing PayrollService::deleteGrade for ${id} by user: ${currentUser?.id}`);
  return repository.deleteGrade(id);
};

export const createLoanAdvance = async (loanData, currentUser) => {
  logger.info(`Executing PayrollService::createLoanAdvance by user: ${currentUser?.id}`);
  return repository.saveLoanAdvance(loanData);
};

export const createBonus = async (bonusData, currentUser) => {
  logger.info(`Executing PayrollService::createBonus by user: ${currentUser?.id}`);
  return repository.saveBonus(bonusData);
};

export const updateBonusStatus = async (id, status, currentUser) => {
  logger.info(`Executing PayrollService::updateBonusStatus for ${id} -> ${status} by user: ${currentUser?.id}`);
  return repository.updateBonusStatus(id, status, currentUser?.name);
};

export const updateReimbursementStatus = async (id, status, currentUser) => {
  logger.info(`Executing PayrollService::updateReimbursementStatus for ${id} -> ${status} by user: ${currentUser?.id}`);
  return repository.updateReimbursementStatus(id, status, currentUser?.name || 'Manager');
};

export const saveMonthlyPayment = async (paymentData, currentUser) => {
  logger.info(`Executing PayrollService::saveMonthlyPayment by user: ${currentUser?.id}`);
  return repository.saveMonthlyPayment(paymentData);
};

export const updatePaymentStatus = async (empId, month, year, status, currentUser) => {
  logger.info(`Executing PayrollService::updatePaymentStatus for ${empId} (${month} ${year}) -> ${status} by user: ${currentUser?.id}`);
  return repository.updatePaymentStatus(empId, month, year, status);
};

export const bulkUpdatePaymentStatus = async (month, year, status, currentUser) => {
  logger.info(`Executing PayrollService::bulkUpdatePaymentStatus for ${month} ${year} -> ${status} by user: ${currentUser?.id}`);
  return repository.bulkUpdatePaymentStatus(month, year, status);
};

export const saveGlobalConfigs = async (configs, currentUser) => {
  logger.info(`Executing PayrollService::saveGlobalConfigs by user: ${currentUser?.id}`);
  return repository.saveGlobalConfigs(configs);
};

export default {
  getMasterPayrollData,
  saveGrade,
  deleteGrade,
  createLoanAdvance,
  createBonus,
  updateBonusStatus,
  updateReimbursementStatus,
  saveMonthlyPayment,
  updatePaymentStatus,
  bulkUpdatePaymentStatus,
  saveGlobalConfigs
};

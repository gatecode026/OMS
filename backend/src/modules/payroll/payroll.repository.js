/**
 * @file src/modules/payroll/payroll.repository.js
 * @description Data Access layer for Payroll module utilizing MongoDB/Mongoose.
 */

import {
  PayrollGrade,
  PayrollReimbursement,
  PayrollLoanAdvance,
  PayrollBonus,
  PayrollPayment,
  PayrollConfig
} from './payroll.model.js';
import logger from '../../config/logger.js';
import { getTenantId } from '../../utils/tenantContext.js';

// Get unified master dataset
export const getMasterPayrollData = async () => {
  logger.debug('Executing PayrollRepository::getMasterPayrollData');
  
  const grades = await PayrollGrade.find().lean();
  const reimbursements = await PayrollReimbursement.find().lean();
  const loans = await PayrollLoanAdvance.find().lean();
  const bonuses = await PayrollBonus.find().lean();
  const payments = await PayrollPayment.find().lean();
  
  // Find or create global config
  let config = await PayrollConfig.findOne({ id: 'GLOBAL_CONFIG' }).lean();
  if (!config) {
    config = await PayrollConfig.create({
      id: 'GLOBAL_CONFIG',
      leaveDeductionRate: 2000,
      lateArrivalPenalty: 300,
      overtimeHourlyRate: 500,
      taxProfiles: {},
      salaryStructures: {},
      attendanceDaysMap: {}
    });
    config = config.toObject();
  }

  return {
    grades,
    reimbursements,
    loans: loans.filter(l => l.type === 'Loan'),
    advances: loans.filter(l => l.type === 'Advance'),
    bonuses,
    payments,
    config
  };
};

// CRUD for Salary Grade structures
export const saveGrade = async (gradeData) => {
  logger.debug('Executing PayrollRepository::saveGrade', gradeData);
  if (!gradeData.id) {
    const count = await PayrollGrade.countDocuments();
    gradeData.id = `GRD-${Date.now().toString().slice(-3)}-${count + 1}`;
  }
  return PayrollGrade.findOneAndUpdate({ id: gradeData.id }, gradeData, { upsert: true, new: true }).lean();
};

export const deleteGrade = async (id) => {
  logger.debug('Executing PayrollRepository::deleteGrade for: ' + id);
  return PayrollGrade.findOneAndDelete({ id }).lean();
};

// CRUD for Loans & Advances
export const saveLoanAdvance = async (loanData) => {
  logger.debug('Executing PayrollRepository::saveLoanAdvance', loanData);
  if (loanData.type === 'Advance') {
    loanData.loanType = 'Advance Salary';
    loanData.emi = 0;
  }
  if (!loanData.id) {
    const count = await PayrollLoanAdvance.countDocuments();
    const prefix = loanData.type === 'Loan' ? 'LON' : 'ADV';
    loanData.id = `${prefix}-${Date.now().toString().slice(-3)}-${count + 1}`;
  }
  return PayrollLoanAdvance.findOneAndUpdate({ id: loanData.id }, loanData, { upsert: true, new: true }).lean();
};

// CRUD for Bonuses
export const saveBonus = async (bonusData) => {
  logger.debug('Executing PayrollRepository::saveBonus', bonusData);
  if (!bonusData.id) {
    const count = await PayrollBonus.countDocuments();
    bonusData.id = `BNS-${Date.now().toString().slice(-3)}-${count + 1}`;
  }
  return PayrollBonus.findOneAndUpdate({ id: bonusData.id }, bonusData, { upsert: true, new: true }).lean();
};

export const updateBonusStatus = async (id, status, reviewerName) => {
  logger.debug(`Executing PayrollRepository::updateBonusStatus: ${id} -> ${status}`);
  const bonus = await PayrollBonus.findOne({ id });
  if (!bonus) return null;
  
  bonus.status = status;
  if (reviewerName) {
    bonus.approvalFlow.push(`${status} by ${reviewerName}`);
  }
  await bonus.save();
  return bonus.toObject();
};

// CRUD for Reimbursements
export const updateReimbursementStatus = async (id, status, approvedBy) => {
  logger.debug(`Executing PayrollRepository::updateReimbursementStatus: ${id} -> ${status}`);
  return PayrollReimbursement.findOneAndUpdate(
    { id },
    { status, approvedBy },
    { new: true }
  ).lean();
};

// CRUD for Monthly Processed Payments
export const saveMonthlyPayment = async (paymentData) => {
  logger.debug('Executing PayrollRepository::saveMonthlyPayment', paymentData);
  if (!paymentData.id) {
    paymentData.id = `${paymentData.employeeId}-${paymentData.month}-${paymentData.year}`;
  }
  
  const existing = await PayrollPayment.findOne({ id: paymentData.id });
  if (!existing && !paymentData.payrollCode) {
    const companyId = getTenantId() || paymentData.companyId || 'COMP-001';
    const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
    paymentData.payrollCode = await generateCompanyUniqueId(companyId, 'payroll');
  }

  return PayrollPayment.findOneAndUpdate({ id: paymentData.id }, paymentData, { upsert: true, new: true }).lean();
};

export const updatePaymentStatus = async (empId, month, year, status) => {
  logger.debug(`Executing PayrollRepository::updatePaymentStatus: ${empId} for ${month} ${year} -> ${status}`);
  const id = `${empId}-${month}-${year}`;
  return PayrollPayment.findOneAndUpdate({ id }, { status }, { new: true }).lean();
};

export const bulkUpdatePaymentStatus = async (month, year, status) => {
  logger.debug(`Executing PayrollRepository::bulkUpdatePaymentStatus: ${month} ${year} -> ${status}`);
  await PayrollPayment.updateMany({ month, year }, { status });
  return PayrollPayment.find({ month, year }).lean();
};

// Global config mutations
export const saveGlobalConfigs = async (configs) => {
  logger.debug('Executing PayrollRepository::saveGlobalConfigs', configs);
  return PayrollConfig.findOneAndUpdate(
    { id: 'GLOBAL_CONFIG' },
    configs,
    { upsert: true, new: true }
  ).lean();
};

export default {
  getMasterPayrollData,
  saveGrade,
  deleteGrade,
  saveLoanAdvance,
  saveBonus,
  updateBonusStatus,
  updateReimbursementStatus,
  saveMonthlyPayment,
  updatePaymentStatus,
  bulkUpdatePaymentStatus,
  saveGlobalConfigs
};

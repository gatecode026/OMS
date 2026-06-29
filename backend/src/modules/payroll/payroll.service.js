/**
 * @file src/modules/payroll/payroll.service.js
 * @description Service business logic wrapper for Payroll module.
 */

import mongoose from 'mongoose';
import repository from './payroll.repository.js';
import logger from '../../config/logger.js';

const getBranchManagerBranch = async (currentUser) => {
  if (!currentUser) return null;
  const role = (currentUser.role || '').toLowerCase();
  
  if (['super_admin', 'company_admin', 'superadmin', 'companyadmin'].includes(role)) {
    return null;
  }
  
  const Branch = mongoose.model('Branch');
  const managedBranch = await Branch.findOne({ managerId: currentUser.id }).lean();
  if (managedBranch) {
    return managedBranch.name;
  }
  if (role === 'branch_admin' || role === 'branchadmin') {
    return currentUser.branch;
  }
  return null;
};

const validateEmployeeInBranch = async (employeeId, branchName) => {
  if (!employeeId || !branchName) return;
  const Employee = mongoose.model('Employee');
  const emp = await Employee.findOne({ id: employeeId }).lean();
  if (emp && emp.branch !== branchName) {
    const err = new Error(`Access denied: Employee ${employeeId} belongs to branch "${emp.branch}", not "${branchName}".`);
    err.statusCode = 403;
    throw err;
  }
};

export const getMasterPayrollData = async (currentUser) => {
  logger.info('Executing PayrollService::getMasterPayrollData');
  let data = await repository.getMasterPayrollData();
  
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    logger.info(`Filtering master payroll data for branch: "${branchName}"`);
    const Employee = mongoose.model('Employee');
    const branchEmployees = await Employee.find({ branch: branchName }).select('id').lean();
    const branchEmployeeIds = new Set(branchEmployees.map(e => e.id));
    
    data.reimbursements = data.reimbursements.filter(r => branchEmployeeIds.has(r.employeeId));
    data.loans = data.loans.filter(l => branchEmployeeIds.has(l.employeeId));
    data.advances = data.advances.filter(a => branchEmployeeIds.has(a.employeeId));
    data.bonuses = data.bonuses.filter(b => branchEmployeeIds.has(b.employeeId));
    data.payments = data.payments.filter(p => branchEmployeeIds.has(p.employeeId));
    data.grades = data.grades.filter(g => g.branch === branchName);
  }
  return data;
};

export const saveGrade = async (gradeData, currentUser) => {
  logger.info(`Executing PayrollService::saveGrade by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    gradeData.branch = branchName;
  }
  return repository.saveGrade(gradeData);
};

export const deleteGrade = async (id, currentUser) => {
  logger.info(`Executing PayrollService::deleteGrade for ${id} by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    const Grade = mongoose.model('PayrollGrade');
    const grade = await Grade.findOne({ id }).lean();
    if (grade && grade.branch !== branchName) {
      const err = new Error(`Access denied: Salary grade belongs to branch "${grade.branch}", not "${branchName}".`);
      err.statusCode = 403;
      throw err;
    }
  }
  return repository.deleteGrade(id);
};

export const createLoanAdvance = async (loanData, currentUser) => {
  logger.info(`Executing PayrollService::createLoanAdvance by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    await validateEmployeeInBranch(loanData.employeeId, branchName);
  }
  return repository.saveLoanAdvance(loanData);
};

export const updateLoanAdvanceStatus = async (id, status, currentUser) => {
  logger.info(`Executing PayrollService::updateLoanAdvanceStatus for ${id} -> ${status} by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    const LoanAdvance = mongoose.model('PayrollLoanAdvance');
    const doc = await LoanAdvance.findOne({ id }).lean();
    if (doc && doc.employeeId) {
      await validateEmployeeInBranch(doc.employeeId, branchName);
    }
  }
  return repository.updateLoanAdvanceStatus(id, status);
};

export const createBonus = async (bonusData, currentUser) => {
  logger.info(`Executing PayrollService::createBonus by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    await validateEmployeeInBranch(bonusData.employeeId, branchName);
  }
  return repository.saveBonus(bonusData);
};

export const updateBonusStatus = async (id, status, currentUser) => {
  logger.info(`Executing PayrollService::updateBonusStatus for ${id} -> ${status} by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    const Bonus = mongoose.model('PayrollBonus');
    const doc = await Bonus.findOne({ id }).lean();
    if (doc && doc.employeeId) {
      await validateEmployeeInBranch(doc.employeeId, branchName);
    }
  }
  return repository.updateBonusStatus(id, status, currentUser?.name);
};

export const updateReimbursementStatus = async (id, status, currentUser) => {
  logger.info(`Executing PayrollService::updateReimbursementStatus for ${id} -> ${status} by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    const Reimbursement = mongoose.model('PayrollReimbursement');
    const doc = await Reimbursement.findOne({ id }).lean();
    if (doc && doc.employeeId) {
      await validateEmployeeInBranch(doc.employeeId, branchName);
    }
  }
  return repository.updateReimbursementStatus(id, status, currentUser?.name || 'Manager');
};

export const saveMonthlyPayment = async (paymentData, currentUser) => {
  logger.info(`Executing PayrollService::saveMonthlyPayment by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    await validateEmployeeInBranch(paymentData.employeeId, branchName);
  }
  return repository.saveMonthlyPayment(paymentData);
};

export const updatePaymentStatus = async (empId, month, year, status, currentUser) => {
  logger.info(`Executing PayrollService::updatePaymentStatus for ${empId} (${month} ${year}) -> ${status} by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    await validateEmployeeInBranch(empId, branchName);
  }
  return repository.updatePaymentStatus(empId, month, year, status);
};

export const bulkUpdatePaymentStatus = async (month, year, status, currentUser) => {
  logger.info(`Executing PayrollService::bulkUpdatePaymentStatus for ${month} ${year} -> ${status} by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    const Employee = mongoose.model('Employee');
    const branchEmployees = await Employee.find({ branch: branchName }).select('id').lean();
    const branchEmployeeIds = branchEmployees.map(e => e.id);
    
    const Payment = mongoose.model('PayrollPayment');
    await Payment.updateMany(
      { month, year, employeeId: { $in: branchEmployeeIds } },
      { status }
    );
    return Payment.find({ month, year, employeeId: { $in: branchEmployeeIds } }).lean();
  }
  return repository.bulkUpdatePaymentStatus(month, year, status);
};

export const saveGlobalConfigs = async (configs, currentUser) => {
  logger.info(`Executing PayrollService::saveGlobalConfigs by user: ${currentUser?.id}`);
  const branchName = await getBranchManagerBranch(currentUser);
  if (branchName) {
    const err = new Error('Access denied: Branch Managers cannot modify global payroll configurations.');
    err.statusCode = 403;
    throw err;
  }
  return repository.saveGlobalConfigs(configs);
};

export default {
  getMasterPayrollData,
  saveGrade,
  deleteGrade,
  createLoanAdvance,
  updateLoanAdvanceStatus,
  createBonus,
  updateBonusStatus,
  updateReimbursementStatus,
  saveMonthlyPayment,
  updatePaymentStatus,
  bulkUpdatePaymentStatus,
  saveGlobalConfigs
};

/**
 * @file src/modules/payroll/payroll.repository.js
 * @description Data Access layer for Payroll module, secured by the Enterprise Authorization Framework.
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
import { CacheKeys, TTL, cacheGetOrSet, cacheDel } from '../../services/cache.service.js';

// Security and Query Builder Imports
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { 
  validateRepositoryAccess, 
  sanitizeQueryOperators 
} from '../../security/repositoryContract.js';
import { PayrollResourceQueryBuilder } from './payroll.queryBuilder.js';

/**
 * Overrides the department field dynamically to prevent department scope violations
 * for admin/manager roles.
 */
const overrideDepartmentForAdminRoles = (record, context) => {
  if (record && context) {
    const bypassRoles = ['hr_manager', 'finance_manager', 'branch_manager', 'branch_admin', 'manager'];
    if (bypassRoles.includes(context.role)) {
      record.department = context.department;
    }
  }
  return record;
};

// Get unified master dataset — cached for 5 minutes to avoid 6 sequential DB queries on every login
export const getMasterPayrollData = async () => {
  logger.debug('Executing PayrollRepository::getMasterPayrollData');
  const context = resolveSecurityContext();
  const companyId = getTenantId();
  const builder = new PayrollResourceQueryBuilder(context);

  const queryFilters = await builder.buildQuery({}, 'payroll');

  // If employee, they cannot view Grades or Configs at all
  const showGrades = context ? (context.isSuperAdmin || context.isCompanyAdmin || context.role === 'hr_manager' || context.role === 'finance_manager') : true;
  const showConfig = context ? (context.isSuperAdmin || context.isCompanyAdmin || context.role === 'hr_manager' || context.role === 'finance_manager') : true;

  // Use a role-scoped cache key so employee vs admin see correct filtered data
  const roleScope = context?.role || 'unknown';
  const cacheKey = companyId ? `payroll_master:${companyId}:${roleScope}` : null;

  const fetchFreshData = async () => {
    const grades = showGrades ? await PayrollGrade.find().lean() : [];
    const reimbursements = await PayrollReimbursement.find(queryFilters).lean();
    const loans = await PayrollLoanAdvance.find(queryFilters).lean();
    const bonuses = await PayrollBonus.find(queryFilters).lean();
    const payments = await PayrollPayment.find(queryFilters).lean();

    // Find or create global config
    let config = null;
    if (showConfig) {
      config = await PayrollConfig.findOne({ id: 'GLOBAL_CONFIG' }).lean();
      if (!config) {
        config = await PayrollConfig.create({
          id: 'GLOBAL_CONFIG',
          leaveDeductionRate: 2000,
          lateArrivalPenalty: 300,
          overtimeHourlyRate: 500,
          taxProfiles: {},
          salaryStructures: {},
          attendanceDaysMap: {},
          timelineDeadlines: {
            reimbursementCutoff: 20,
            attendanceVerification: 25,
            payrollProcessing: 28,
            salaryDisbursement: 30
          },
          complianceSchedules: [
            { id: 'tds_deposit', title: 'Monthly TDS Deposit Due', day: 7, monthOffset: 1, info: 'Challan ITNS 281' },
            { id: 'pf_esi_filing', title: 'PF & ESI Filing Deadline', day: 15, monthOffset: 1, info: 'Form 5 & Form 10' },
            { id: 'tds_return_q1', title: 'TDS Return Filing (Q1)', day: 31, monthOffset: 1, info: 'Form 24Q Submission • FY 2026-27' }
          ],
          complianceNotices: [
            'Submission window for Q1 Investment Proofs is currently open.',
            'Penalty for late TDS return filing is ₹200 per day under Section 234E.'
          ]
        });
        config = config.toObject();
      } else {
        // Ensure existing configs have defaults if fields are missing
        let updated = false;
        if (!config.timelineDeadlines) {
          config.timelineDeadlines = {
            reimbursementCutoff: 20,
            attendanceVerification: 25,
            payrollProcessing: 28,
            salaryDisbursement: 30
          };
          updated = true;
        }
        if (!config.complianceSchedules) {
          config.complianceSchedules = [
            { id: 'tds_deposit', title: 'Monthly TDS Deposit Due', day: 7, monthOffset: 1, info: 'Challan ITNS 281' },
            { id: 'pf_esi_filing', title: 'PF & ESI Filing Deadline', day: 15, monthOffset: 1, info: 'Form 5 & Form 10' },
            { id: 'tds_return_q1', title: 'TDS Return Filing (Q1)', day: 31, monthOffset: 1, info: 'Form 24Q Submission • FY 2026-27' }
          ];
          updated = true;
        }
        if (!config.complianceNotices) {
          config.complianceNotices = [
            'Submission window for Q1 Investment Proofs is currently open.',
            'Penalty for late TDS return filing is ₹200 per day under Section 234E.'
          ];
          updated = true;
        }
        if (updated) {
          await PayrollConfig.updateOne({ id: 'GLOBAL_CONFIG' }, {
            $set: {
              timelineDeadlines: config.timelineDeadlines,
              complianceSchedules: config.complianceSchedules,
              complianceNotices: config.complianceNotices
            }
          });
        }
      }
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

  if (cacheKey) {
    return cacheGetOrSet(cacheKey, fetchFreshData, TTL.EMPLOYEE_LIST);
  }
  return fetchFreshData();
};

// CRUD for Salary Grade structures
export const saveGrade = async (gradeData) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(gradeData);

  if (context) {
    overrideDepartmentForAdminRoles(gradeData, context);
    await validateRepositoryAccess('update', gradeData, { moduleName: 'Payroll' });
  }

  logger.debug('Executing PayrollRepository::saveGrade', gradeData);
  if (!gradeData.id) {
    const count = await PayrollGrade.countDocuments();
    gradeData.id = `GRD-${Date.now().toString().slice(-3)}-${count + 1}`;
  }
  return PayrollGrade.findOneAndUpdate({ id: gradeData.id }, gradeData, { upsert: true, new: true }).lean();
};

export const deleteGrade = async (id) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id });

  const record = await PayrollGrade.findOne({ id });
  if (record && context) {
    overrideDepartmentForAdminRoles(record, context);
    await validateRepositoryAccess('delete', record, { moduleName: 'Payroll' });
  }

  logger.debug('Executing PayrollRepository::deleteGrade for: ' + id);
  return PayrollGrade.findOneAndDelete({ id }).lean();
};

// CRUD for Loans & Advances
export const saveLoanAdvance = async (loanData) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(loanData);

  if (context) {
    overrideDepartmentForAdminRoles(loanData, context);
    await validateRepositoryAccess('create', loanData, { moduleName: 'Payroll', ownerIdFields: ['employeeId'] });
  }

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

export const updateLoanAdvanceStatus = async (id, status) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id, status });

  const record = await PayrollLoanAdvance.findOne({ id });
  if (record && context) {
    overrideDepartmentForAdminRoles(record, context);
    await validateRepositoryAccess('approve', record, { moduleName: 'Payroll' });
  }

  logger.debug(`Executing PayrollRepository::updateLoanAdvanceStatus: ${id} -> ${status}`);
  return PayrollLoanAdvance.findOneAndUpdate(
    { id },
    { status },
    { new: true }
  ).lean();
};

// CRUD for Bonuses
export const saveBonus = async (bonusData) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(bonusData);

  if (context) {
    overrideDepartmentForAdminRoles(bonusData, context);
    await validateRepositoryAccess('create', bonusData, { moduleName: 'Payroll', ownerIdFields: ['employeeId'] });
  }

  logger.debug('Executing PayrollRepository::saveBonus', bonusData);
  if (!bonusData.id) {
    const count = await PayrollBonus.countDocuments();
    bonusData.id = `BNS-${Date.now().toString().slice(-3)}-${count + 1}`;
  }
  return PayrollBonus.findOneAndUpdate({ id: bonusData.id }, bonusData, { upsert: true, new: true }).lean();
};

export const updateBonusStatus = async (id, status, reviewerName) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id, status, reviewerName });

  const record = await PayrollBonus.findOne({ id });
  if (record && context) {
    overrideDepartmentForAdminRoles(record, context);
    await validateRepositoryAccess('approve', record, { moduleName: 'Payroll' });
  }

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
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id, status, approvedBy });

  const record = await PayrollReimbursement.findOne({ id });
  if (record && context) {
    overrideDepartmentForAdminRoles(record, context);
    await validateRepositoryAccess('approve', record, { moduleName: 'Payroll' });
  }

  logger.debug(`Executing PayrollRepository::updateReimbursementStatus: ${id} -> ${status}`);
  return PayrollReimbursement.findOneAndUpdate(
    { id },
    { status, approvedBy },
    { new: true }
  ).lean();
};

// CRUD for Monthly Processed Payments
export const saveMonthlyPayment = async (paymentData) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(paymentData);

  if (context) {
    overrideDepartmentForAdminRoles(paymentData, context);
    await validateRepositoryAccess('create', paymentData, { moduleName: 'Payroll', ownerIdFields: ['employeeId'] });
  }

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
  const context = resolveSecurityContext();
  const id = `${empId}-${month}-${year}`;
  sanitizeQueryOperators({ empId, month, year, status });

  const record = await PayrollPayment.findOne({ id });
  if (record && context) {
    overrideDepartmentForAdminRoles(record, context);
    await validateRepositoryAccess('update', record, { 
      moduleName: 'Payroll', 
      ownerIdFields: ['employeeId'],
      updatePayload: { status }
    });
  }

  logger.debug(`Executing PayrollRepository::updatePaymentStatus: ${empId} for ${month} ${year} -> ${status}`);
  return PayrollPayment.findOneAndUpdate({ id }, { status }, { new: true }).lean();
};

export const bulkUpdatePaymentStatus = async (month, year, status) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ month, year, status });

  if (context) {
    await validateRepositoryAccess('update', { id: `${month}-${year}` }, { moduleName: 'Payroll' });
  }

  logger.debug(`Executing PayrollRepository::bulkUpdatePaymentStatus: ${month} ${year} -> ${status}`);
  await PayrollPayment.updateMany({ month, year }, { status });
  return PayrollPayment.find({ month, year }).lean();
};

// Global config mutations
export const saveGlobalConfigs = async (configs) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(configs);

  if (context) {
    await validateRepositoryAccess('update', configs, { moduleName: 'Payroll' });
  }

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
  updateLoanAdvanceStatus,
  saveBonus,
  updateBonusStatus,
  updateReimbursementStatus,
  saveMonthlyPayment,
  updatePaymentStatus,
  bulkUpdatePaymentStatus,
  saveGlobalConfigs
};

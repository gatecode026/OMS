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
import { getTenantConnection } from '../../utils/multidbConnection.js';
import { CacheKeys, TTL, cacheGetOrSet, cacheDel, cacheDelPattern } from '../../services/cache.service.js';

// Security and Query Builder Imports
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { checkActionPermission } from '../../security/permissionMatrix.js';
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
    const bypassRoles = ['manager'];
    if (bypassRoles.includes(context.role)) {
      record.department = context.department;
    }
  }
  return record;
};

/**
 * Utility helper to invalidate all cached payroll dashboard views when any mutation happens
 */
const clearPayrollCache = async () => {
  try {
    const companyId = getTenantId();
    if (companyId) {
      await cacheDelPattern(`payroll_master:${companyId}:*`);
    } else {
      await cacheDelPattern('payroll_master:*');
    }
  } catch (err) {
    logger.error('Failed to clear payroll cache:', err);
  }
};

// Get unified master dataset — cached for 5 minutes to avoid 6 sequential DB queries on every login
export const getMasterPayrollData = async () => {
  logger.debug('Executing PayrollRepository::getMasterPayrollData');
  const context = resolveSecurityContext();
  const companyId = getTenantId();
  const builder = new PayrollResourceQueryBuilder(context);

  const queryFilters = await builder.buildQuery({}, 'payroll');

  // Dynamically resolve permission from matrix instead of using hardcoded roles
  const showGrades = context ? await checkActionPermission('PayrollGrade', context.role, 'read') : true;
  const showConfig = context ? await checkActionPermission('PayrollConfig', context.role, 'read') : true;

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

    // Fetch leave policies from the tenant database
    let leavePolicies = [];
    try {
      const conn = await getTenantConnection(companyId);
      if (conn.asPromise) await conn.asPromise();
      leavePolicies = await conn.collection('leaves').find({ isPolicy: true }).toArray();
    } catch (e) {
      logger.warn('Could not fetch leave policies for payroll master data: ' + e.message);
    }

    return {
      grades,
      reimbursements,
      loans: loans.filter(l => l.type === 'Loan'),
      advances: loans.filter(l => l.type === 'Advance'),
      bonuses,
      payments,
      config,
      leavePolicies
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
  if (!gradeData.companyId) {
    gradeData.companyId = getTenantId() || 'COMP-001';
  }
  if (!gradeData.id) {
    const count = await PayrollGrade.countDocuments();
    gradeData.id = `GRD-${Date.now().toString().slice(-3)}-${count + 1}`;
  }
  const result = await PayrollGrade.findOneAndUpdate({ id: gradeData.id }, gradeData, { upsert: true, new: true }).lean();
  await clearPayrollCache();
  return result;
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
  const result = await PayrollGrade.findOneAndDelete({ id }).lean();
  await clearPayrollCache();
  return result;
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
  if (!loanData.companyId) {
    loanData.companyId = getTenantId() || 'COMP-001';
  }
  if (loanData.type === 'Advance') {
    loanData.loanType = 'Advance Salary';
    loanData.emi = 0;
  }
  if (!loanData.id) {
    const count = await PayrollLoanAdvance.countDocuments();
    const prefix = loanData.type === 'Loan' ? 'LON' : 'ADV';
    loanData.id = `${prefix}-${Date.now().toString().slice(-3)}-${count + 1}`;
  }
  const result = await PayrollLoanAdvance.findOneAndUpdate({ id: loanData.id }, loanData, { upsert: true, new: true }).lean();
  await clearPayrollCache();
  return result;
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
  const result = await PayrollLoanAdvance.findOneAndUpdate(
    { id },
    { status },
    { new: true }
  ).lean();
  await clearPayrollCache();
  return result;
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
  if (!bonusData.companyId) {
    bonusData.companyId = getTenantId() || 'COMP-001';
  }
  if (!bonusData.id) {
    const count = await PayrollBonus.countDocuments();
    bonusData.id = `BNS-${Date.now().toString().slice(-3)}-${count + 1}`;
  }
  const result = await PayrollBonus.findOneAndUpdate({ id: bonusData.id }, bonusData, { upsert: true, new: true }).lean();
  await clearPayrollCache();
  return result;
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
  const result = bonus.toObject();
  await clearPayrollCache();
  return result;
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
  const result = await PayrollReimbursement.findOneAndUpdate(
    { id },
    { status, approvedBy },
    { new: true }
  ).lean();
  await clearPayrollCache();
  return result;
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
  const updatePayload = { ...paymentData };
  delete updatePayload._id;
  delete updatePayload.createdAt;
  delete updatePayload.updatedAt;

  if (!updatePayload.companyId) {
    updatePayload.companyId = getTenantId() || 'COMP-001';
  }

  if (!updatePayload.id) {
    updatePayload.id = `${updatePayload.employeeId}-${updatePayload.month}-${updatePayload.year}`;
  }
  
  const existing = await PayrollPayment.findOne({ id: updatePayload.id });
  if (!existing && !updatePayload.payrollCode) {
    const companyId = getTenantId() || updatePayload.companyId || 'COMP-001';
    const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
    updatePayload.payrollCode = await generateCompanyUniqueId(companyId, 'payroll');
  }

  const result = await PayrollPayment.findOneAndUpdate({ id: updatePayload.id }, updatePayload, { upsert: true, new: true }).lean();
  await clearPayrollCache();
  return result;
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
  const result = await PayrollPayment.findOneAndUpdate({ id }, { status }, { new: true }).lean();
  await clearPayrollCache();
  return result;
};

export const bulkUpdatePaymentStatus = async (month, year, status) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ month, year, status });

  if (context) {
    await validateRepositoryAccess('update', { id: `${month}-${year}` }, { moduleName: 'Payroll' });
  }

  logger.debug(`Executing PayrollRepository::bulkUpdatePaymentStatus: ${month} ${year} -> ${status}`);
  await PayrollPayment.updateMany({ month, year }, { status });
  const result = await PayrollPayment.find({ month, year }).lean();
  await clearPayrollCache();
  return result;
};

// Global config mutations
export const saveGlobalConfigs = async (configs) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(configs);

  if (context) {
    await validateRepositoryAccess('update', configs, { moduleName: 'Payroll' });
  }

  logger.debug('Executing PayrollRepository::saveGlobalConfigs', configs);
  await clearPayrollCache();

  return PayrollConfig.findOneAndUpdate(
    { id: 'GLOBAL_CONFIG' },
    configs,
    { upsert: true, new: true }
  ).lean();
};

export const resetPaymentDeductions = async ({ employeeId, month, year, fields }) => {
  logger.debug(`PayrollRepository::resetPaymentDeductions - employee: ${employeeId}, month: ${month}, year: ${year}`);
  const query = {};
  if (employeeId) query.employeeId = employeeId;
  if (month) query.month = month;
  if (year) query.year = year;

  // Default fields to zero out if not specified
  const fieldsToReset = fields || ['tds', 'pf', 'pt', 'esi'];
  const updateSet = {};
  for (const field of fieldsToReset) {
    updateSet[field] = 0;
  }

  // Recalculate totalDeductions and netSalary for all matching records
  const records = await PayrollPayment.find(query).lean();
  for (const record of records) {
    const newPf = fieldsToReset.includes('pf') ? 0 : (record.pf || 0);
    const newTds = fieldsToReset.includes('tds') ? 0 : (record.tds || 0);
    const newPt = fieldsToReset.includes('pt') ? 0 : (record.pt || 0);
    const newEsi = fieldsToReset.includes('esi') ? 0 : (record.esi || 0);
    const statutory = newPf + newTds + newPt + newEsi;
    const leaveDeductions = record.leaveDeductions || 0;
    const lateDeductions = record.lateDeductions || 0;
    const loanEMI = record.loanEMI || 0;
    const advanceDeduct = record.advanceDeduct || 0;
    const newTotalDeductions = statutory + leaveDeductions + lateDeductions + loanEMI + advanceDeduct;
    const grossSalary = record.grossSalary || 0;
    const newNetSalary = Math.max(0, grossSalary - newTotalDeductions);

    await PayrollPayment.updateOne(
      { _id: record._id },
      { $set: { ...updateSet, totalDeductions: newTotalDeductions, netSalary: newNetSalary } }
    );
  }

  await clearPayrollCache();
  return { updated: records.length };
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
  saveGlobalConfigs,
  resetPaymentDeductions
};

/**
 * @file src/modules/leaves/leaves.repository.js
 * @description Data Access layer for Leaves module.
 */

import Leave from './leaves.model.js';
import logger from '../../config/logger.js';

// Security and Query Builder Imports
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { 
  validateRepositoryAccess, 
  sanitizeQueryOperators, 
  getQueryLogging 
} from '../../security/repositoryContract.js';
import { LeaveQueryBuilder } from './leaves.queryBuilder.js';
import { checkActionPermission } from '../../security/permissionMatrix.js';

/**
 * Validates that the active context is authorized to perform policy modifications.
 */
const validatePolicyAdminAccess = async (context) => {
  if (!context) return;
  if (context.isSuperAdmin || context.isCompanyAdmin) return;

  // Employees and Team Leaders are never allowed to modify global leave policies
  if (context.role === 'employee' || context.role === 'team_leader') {
    const err = new Error('Access denied: Only Administrators are authorized to modify Leave Policies.');
    err.statusCode = 403;
    throw err;
  }

  // Check dynamic DB action-level permissions for other roles
  const isAllowed = await checkActionPermission('Leave', context.role, 'update');
  if (!isAllowed) {
    const err = new Error('Access denied: Only Administrators are authorized to modify Leave Policies.');
    err.statusCode = 403;
    throw err;
  }
};

/**
 * Find all leave requests matching optional query filters with scoping.
 * @param {Object} query - Client-supplied query filters
 */
export const find = async (query = {}) => {
  const context = resolveSecurityContext();
  const builder = new LeaveQueryBuilder(context);

  // 1. Sanitize incoming client query
  sanitizeQueryOperators(query);

  // 2. Parse client filters based on legacy logic
  const filters = { isPolicy: { $ne: true } };
  if (query.employeeId) filters.employeeId = query.employeeId;
  if (query.status) filters.status = query.status;
  if (query.type) filters.type = query.type;
  if (query.department) filters.department = query.department;
  
  if (query.search) {
    const escapedSearch = query.search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'i');
    filters.$or = [
      { employeeName: regex },
      { employeeId: regex },
      { department: regex }
    ];
  }

  // 3. Apply role-based query filters
  const scopedFilters = await builder.buildReadQuery(filters);

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] LeavesRepository::find:
    - Incoming Query: ${JSON.stringify(query)}
    - Security Context: ${JSON.stringify(context || {})}
    - Final Mongo Query: ${JSON.stringify(scopedFilters)}
    - Decision: APPROVED`);
  }

  return Leave.find(scopedFilters).sort({ appliedDate: -1, createdAt: -1 });
};

/**
 * Find a single leave request by business ID.
 * @param {String} id - Leave record ID
 */
export const findOne = async (id) => {
  const context = resolveSecurityContext();

  const record = await Leave.findOne({ id, isPolicy: { $ne: true } });

  if (record && context) {
    await validateRepositoryAccess('read', record, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Leave'
    });
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] LeavesRepository::findOne:
    - ID: ${id}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return record;
};

/**
 * Create/Save a new leave request.
 * @param {Object} data - Leave request data
 */
export const save = async (data) => {
  const context = resolveSecurityContext();

  if (context) {
    await validateRepositoryAccess('create', data, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Leave'
    });
  }

  const id = data.id || `LR-${Math.floor(100 + Math.random() * 900)}`;

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] LeavesRepository::save:
    - Input Data: ${JSON.stringify(data)}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return Leave.create({ ...data, id, isPolicy: false });
};

/**
 * Update an existing leave request.
 * @param {String} id - Leave record ID
 * @param {Object} data - Updated fields
 */
export const update = async (id, data) => {
  const context = resolveSecurityContext();

  const record = await Leave.findOne({ id, isPolicy: { $ne: true } });
  if (!record) return null;

      await validateRepositoryAccess('update', record, {
        ownerIdFields: ['employeeId'],
        updatePayload: data,
        moduleName: 'Leave'
      });

  // 2. Enforce field-level protection for standard Employees
  if (context && context.isEmployee) {
    // Standard employee can only update if status is Pending
    if (record.status !== 'Pending') {
      const err = new Error('Access denied: You cannot update a leave request that has already been processed.');
      err.statusCode = 403;
      throw err;
    }

    const restrictedFields = ['approver', 'status', 'approvedBy', 'approvalDate'];
    for (const field of restrictedFields) {
      if (data[field] !== undefined) {
        // Allow cancellation
        if (field === 'status' && data[field] === 'Cancelled') {
          continue;
        }
        // Allow passing the same value as what's already saved (no actual change)
        if (String(data[field]) === String(record[field])) {
          continue;
        }
        const err = new Error(`Access denied: You are not authorized to modify the "${field}" field.`);
        err.statusCode = 403;
        throw err;
      }
    }
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] LeavesRepository::update:
    - ID: ${id}
    - Update Payload: ${JSON.stringify(data)}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return Leave.findOneAndUpdate({ id, isPolicy: { $ne: true } }, data, { new: true });
};

/**
 * Delete/Remove a leave request.
 * @param {String} id - Leave record ID
 */
export const remove = async (id) => {
  const context = resolveSecurityContext();

  const record = await Leave.findOne({ id, isPolicy: { $ne: true } });
  if (!record) return null;

  if (context) {
    await validateRepositoryAccess('delete', record, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Leave'
    });

    // Standard Employee cannot delete if already processed
    if (context.isEmployee && record.status !== 'Pending') {
      const err = new Error('Access denied: You cannot delete a leave request that has already been processed.');
      err.statusCode = 403;
      throw err;
    }
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] LeavesRepository::remove:
    - ID: ${id}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return Leave.findOneAndDelete({ id, isPolicy: { $ne: true } });
};

// ==========================================
// Administrative Leave Policies Authorization Path
// ==========================================

export const findPolicies = async () => {
  logger.debug('Executing LeavesRepository::findPolicies');
  return Leave.find({ isPolicy: true }).sort({ id: 1 });
};

export const findPolicyById = async (id) => {
  logger.debug('Executing LeavesRepository::findPolicyById for ID: ' + id);
  return Leave.findOne({ id, isPolicy: true });
};

export const savePolicy = async (data) => {
  const context = resolveSecurityContext();
  await validatePolicyAdminAccess(context);

  logger.debug('Executing LeavesRepository::savePolicy', data);
  return Leave.create({ ...data, isPolicy: true });
};

export const updatePolicy = async (id, data) => {
  const context = resolveSecurityContext();
  await validatePolicyAdminAccess(context);

  logger.debug('Executing LeavesRepository::updatePolicy for ID: ' + id, data);
  return Leave.findOneAndUpdate({ id, isPolicy: true }, data, { new: true });
};

export const removePolicy = async (id) => {
  const context = resolveSecurityContext();
  await validatePolicyAdminAccess(context);

  logger.debug('Executing LeavesRepository::removePolicy for ID: ' + id);
  return Leave.findOneAndDelete({ id, isPolicy: true });
};

export const resetPolicies = async () => {
  const context = resolveSecurityContext();
  await validatePolicyAdminAccess(context);

  logger.debug('Executing LeavesRepository::resetPolicies');
  await Leave.deleteMany({ isPolicy: true }).setOptions({ bypassTenantScoping: true });
  const defaultPolicies = [
    { id: 'POL-001', leaveCode: 'CL', leaveName: 'Casual Leave', defaultDays: 8, maxCarryForward: 5, isActive: true, genderRestriction: 'All', description: 'For personal urgent reasons or brief errands', isPolicy: true },
    { id: 'POL-002', leaveCode: 'SL', leaveName: 'Sick Leave', defaultDays: 10, maxCarryForward: 3, isActive: true, genderRestriction: 'All', description: 'For medical recovery or doctor consultations', isPolicy: true },
    { id: 'POL-003', leaveCode: 'PL', leaveName: 'Paid Leave', defaultDays: 15, maxCarryForward: 10, isActive: true, genderRestriction: 'All', description: 'Annual leave for vacation or relaxation', isPolicy: true },
    { id: 'POL-010', leaveCode: 'UL', leaveName: 'Unpaid Leave', defaultDays: 30, maxCarryForward: 0, isActive: true, genderRestriction: 'All', description: 'Without pay when balances exhausted', isPolicy: true }
  ];
  return Leave.insertMany(defaultPolicies);
};

export default {
  find,
  findOne,
  save,
  update,
  remove,
  findPolicies,
  findPolicyById,
  savePolicy,
  updatePolicy,
  removePolicy,
  resetPolicies
};

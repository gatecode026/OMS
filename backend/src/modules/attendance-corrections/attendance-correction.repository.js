/**
 * @file src/modules/attendance-corrections/attendance-correction.repository.js
 * @description Data Access layer for Attendance Correction Requests.
 */

import AttendanceCorrection from './attendance-correction.model.js';
import logger from '../../config/logger.js';
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { validateRepositoryAccess, sanitizeQueryOperators, getQueryLogging } from '../../security/repositoryContract.js';

/**
 * Builds the MongoDB query filters for reading Attendance Correction records based on security context.
 */
const buildScopedQuery = (context, incomingQuery = {}) => {
  const filters = { ...incomingQuery };

  if (!context) return filters;
  if (context.isSuperAdmin || context.isCompanyAdmin) {
    return filters; // Admin needs no scoping filters within tenant isolation
  }

  // Branch Admin / Branch Manager see requests in their branch
  if (context.isBranchAdmin || context.isManager) {
    if (context.branch) {
      filters.branch = context.branch;
    }
  }

  // Department Manager sees requests in their department
  if (context.role === 'department_manager' || context.role === 'dept_admin') {
    if (context.department) {
      filters.department = context.department;
    }
    if (context.branch) {
      filters.branch = context.branch;
    }
  }

  // Team Leader sees only members of their assigned team (plus their own)
  if (context.isTeamLeader) {
    const teamEmployeeIds = context.teamEmployeeIds || [];
    const allowedIds = [...teamEmployeeIds, context.userId];
    if (incomingQuery.employeeId) {
      if (allowedIds.includes(incomingQuery.employeeId)) {
        filters.employeeId = incomingQuery.employeeId;
      } else {
        filters.employeeId = 'UNAUTHORIZED';
      }
    } else {
      filters.employeeId = { $in: allowedIds };
    }
  }

  // Standard employee can only see their own requests
  if (context.isEmployee) {
    filters.employeeId = context.userId;
  }

  return filters;
};

export const find = async (query = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  const filters = {};
  if (query.employeeId) filters.employeeId = query.employeeId;
  if (query.status) filters.status = query.status;
  if (query.date) filters.date = query.date;
  if (query.correctionType) filters.correctionType = query.correctionType;
  if (query.branch) filters.branch = query.branch;
  if (query.department) filters.department = query.department;

  if (query.from && query.to) {
    filters.date = { $gte: query.from, $lte: query.to };
  }

  if (query.search) {
    const escapedSearch = query.search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'i');
    filters.$or = [
      { employeeName: regex },
      { employeeId: regex },
      { department: regex },
      { correctionType: regex }
    ];
  }

  const scopedFilters = buildScopedQuery(context, filters);

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] AttendanceCorrectionRepository::find:
    - Security Context: ${JSON.stringify(context || {})}
    - Final Mongo Query: ${JSON.stringify(scopedFilters)}`);
  }

  return AttendanceCorrection.find(scopedFilters).sort({ date: -1, createdAt: -1 });
};

export const findOne = async (id) => {
  const context = resolveSecurityContext();
  const record = await AttendanceCorrection.findOne({ id });

  if (record && context) {
    await validateRepositoryAccess('read', record, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Attendance' // Enforce ownership policies similar to Attendance
    });
  }

  return record;
};

export const save = async (data) => {
  const context = resolveSecurityContext();

  if (context) {
    await validateRepositoryAccess('create', data, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Attendance'
    });
  }

  const id = data.id || `COR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return AttendanceCorrection.create({ ...data, id });
};

export const update = async (id, data) => {
  const context = resolveSecurityContext();
  const record = await AttendanceCorrection.findOne({ id });
  if (!record) return null;

  if (context) {
    await validateRepositoryAccess('update', record, {
      ownerIdFields: ['employeeId'],
      updatePayload: data,
      moduleName: 'Attendance'
    });
  }

  return AttendanceCorrection.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  const context = resolveSecurityContext();
  const record = await AttendanceCorrection.findOne({ id });
  if (!record) return null;

  if (context) {
    await validateRepositoryAccess('delete', record, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Attendance'
    });
  }

  return AttendanceCorrection.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

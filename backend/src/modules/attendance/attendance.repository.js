/**
 * @file src/modules/attendance/attendance.repository.js
 * @description Data Access layer for Attendance module.
 */

import Attendance from './attendance.model.js';
import logger from '../../config/logger.js';
import mongoose from 'mongoose';

// Security and Query Builder Imports
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { 
  validateRepositoryAccess, 
  sanitizeQueryOperators, 
  getQueryLogging 
} from '../../security/repositoryContract.js';
import { AttendanceQueryBuilder } from './attendance.queryBuilder.js';

/**
 * Find all attendance records matching optional query filters with scoping.
 * @param {Object} query - Client-supplied query filters
 */
export const find = async (query = {}) => {
  const context = resolveSecurityContext();
  const builder = new AttendanceQueryBuilder(context);

  // 1. Sanitize incoming client query
  sanitizeQueryOperators(query);

  // 2. Parse client filters based on legacy logic
  const filters = {};
  if (query.employeeId) filters.employeeId = query.employeeId;
  if (query.from && query.to) {
    filters.date = { $gte: query.from, $lte: query.to };
  } else if (query.date) {
    filters.date = query.date;
  } else {
    // Default: limit to last 60 days when no date range is requested.
    // Prevents returning the entire attendance history on initial page load.
    const today = new Date();
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    const toStr = today.toISOString().split('T')[0];
    const fromStr = sixtyDaysAgo.toISOString().split('T')[0];
    filters.date = { $gte: fromStr, $lte: toStr };
  }
  if (query.branch) filters.branch = query.branch;
  if (query.department) filters.department = query.department;
  if (query.status) filters.status = query.status;
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
  const scopedFilters = builder.buildReadQuery(filters);


  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] AttendanceRepository::find:
    - Incoming Query: ${JSON.stringify(query)}
    - Security Context: ${JSON.stringify(context || {})}
    - Final Mongo Query: ${JSON.stringify(scopedFilters)}
    - Decision: APPROVED`);
  }

  return Attendance.find(scopedFilters).sort({ date: -1, createdAt: -1 });
};

/**
 * Find a single attendance record by business ID.
 * @param {String} id - Attendance record ID
 */
/**
 * Find a single attendance record by business ID or Mongo _id.
 * @param {String} id - Attendance record ID
 */
export const findOne = async (id) => {
  const context = resolveSecurityContext();

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ id: id }, { _id: id }] } : { id: id };
  const record = await Attendance.findOne(query);

  if (record && context) {
    await validateRepositoryAccess('read', record, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Attendance'
    });
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] AttendanceRepository::findOne:
    - ID: ${id}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return record;
};

/**
 * Create/Save a new attendance record.
 * @param {Object} data - Attendance data
 */
export const save = async (data) => {
  const context = resolveSecurityContext();

  if (context) {
    await validateRepositoryAccess('create', data, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Attendance'
    });
  }

  const id = data.id || `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] AttendanceRepository::save:
    - Input Data: ${JSON.stringify(data)}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return Attendance.create({ ...data, id });
};

/**
 * Update an existing attendance record.
 * @param {String} id - Attendance record ID
 * @param {Object} data - Updated fields
 */
export const update = async (id, data) => {
  const context = resolveSecurityContext();

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ id: id }, { _id: id }] } : { id: id };
  const record = await Attendance.findOne(query);
  if (!record) return null;

  // 1. Validate write scoping constraints
  if (context) {
    await validateRepositoryAccess('update', record, {
      ownerIdFields: ['employeeId'],
      updatePayload: data,
      moduleName: 'Attendance'
    });
  }

  // 2. Enforce field-level protection for standard Employees
  if (context && context.isEmployee) {
    const restrictedFields = ['employeeId', 'branch', 'department', 'manager'];
    for (const field of restrictedFields) {
      if (data[field] !== undefined && String(data[field] ?? '') !== String(record[field] ?? '')) {
        const err = new Error(`Access denied: You are not authorized to modify the "${field}" field.`);
        err.statusCode = 403;
        throw err;
      }
    }
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] AttendanceRepository::update:
    - ID: ${id}
    - Update Payload: ${JSON.stringify(data)}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return Attendance.findOneAndUpdate({ _id: record._id }, data, { new: true });
};

/**
 * Delete/Remove an attendance record.
 * @param {String} id - Attendance record ID
 */
export const remove = async (id) => {
  const context = resolveSecurityContext();

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ id: id }, { _id: id }] } : { id: id };
  const record = await Attendance.findOne(query);
  if (!record) return null;

  if (context) {
    await validateRepositoryAccess('delete', record, {
      ownerIdFields: ['employeeId'],
      moduleName: 'Attendance'
    });
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] AttendanceRepository::remove:
    - ID: ${id}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return Attendance.findOneAndDelete({ _id: record._id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

/**
 * @file src/modules/employees/employees.repository.js
 * @description Data Access layer for Employees module using Mongoose model.
 */

import bcrypt from 'bcryptjs';
import Employee from './employees.model.js';
import Admin from '../admin/admin.model.js';
import Company from '../companies/company.model.js';
import logger from '../../config/logger.js';
import { processEmployeeAssets } from '../../utils/imagekit.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { CacheKeys, TTL, cacheGetOrSet, cacheDel } from '../../services/cache.service.js';

// Security and Query Builder Imports
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { validateRepositoryAccess, getQueryLogging } from '../../security/repositoryContract.js';
import { EmployeeQueryBuilder } from './employees.queryBuilder.js';

/**
 * Sync real-time employee counts back into Branch and Department stored fields.
 * This is a passive sync that runs after employee create/update/delete.
 * @param {String} companyId - The tenant/company ID
 * @param {String[]} branchNames - Branch names whose count should be refreshed
 * @param {String[]} deptNames - Department names whose count should be refreshed
 */
const syncBranchDeptCounts = async (companyId, branchNames = [], deptNames = []) => {
  if (!companyId) return;
  try {
    const { default: Branch } = await import('../branches/branches.model.js');
    const { default: Department } = await import('../departments/departments.model.js');

    // Sync each unique branch name
    const uniqueBranches = [...new Set(branchNames.filter(Boolean))];
    for (const branchName of uniqueBranches) {
      const count = await Employee.countDocuments({
        companyId,
        branch: { $regex: new RegExp(`^${branchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      await Branch.findOneAndUpdate(
        { companyId, name: { $regex: new RegExp(`^${branchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { $set: { employeeCount: count } }
      );
    }

    // Sync each unique department name
    const uniqueDepts = [...new Set(deptNames.filter(Boolean))];
    for (const deptName of uniqueDepts) {
      const count = await Employee.countDocuments({
        companyId,
        department: { $regex: new RegExp(`^${deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      await Department.findOneAndUpdate(
        { companyId, name: { $regex: new RegExp(`^${deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { $set: { employeeCount: count } }
      );
    }
  } catch (err) {
    logger.error('EmployeesRepository::syncBranchDeptCounts error (non-critical):', err.message);
  }
};

/**
 * Find all employees matching optional query filters
 * @param {Object} query - MongoDB query filters
 */
export const find = async (query = {}) => {
  const companyId = getTenantId();

  const context = resolveSecurityContext();
  const builder = new EmployeeQueryBuilder(context);
  const filters = builder.buildReadQuery(query);

  const queryKeys = Object.keys(filters).filter(k => k !== 'companyId');
  const isListQuery = queryKeys.length === 0;

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] EmployeesRepository::find:
    - Incoming Query: ${JSON.stringify(query)}
    - Security Context: ${JSON.stringify(context || {})}
    - Final Mongo Query: ${JSON.stringify(filters)}
    - Decision: APPROVED`);
  }

  if (isListQuery && companyId) {
    const cacheKey = CacheKeys.empList(companyId);
    return cacheGetOrSet(cacheKey, async () => {
      logger.info('EmployeesRepository::find querying employees from database...');
      return Employee.find(filters)
        .select('-attendanceHistory -overtimeHistory -leaveHistory -taskHistory -activityLog -documents')
        .lean();
    }, TTL.EMPLOYEE_LIST);
  }

  logger.info('EmployeesRepository::find querying filtered employees from database...');
  return Employee.find(filters)
    .select('-attendanceHistory -overtimeHistory -leaveHistory -taskHistory -activityLog -documents')
    .lean();
};

/**
 * Find a single employee by their business ID
 * @param {String} id - Employee business ID (e.g. EMP-2026-001)
 */
export const findOne = async (id) => {
  const companyId = getTenantId();
  const context = resolveSecurityContext();

  const fetchUser = async () => {
    let user = await Employee.findOne({ id }).lean();
    if (!user) {
      logger.info(`EmployeesRepository::findOne employee not found, querying admin with ID: ${id}`);
      user = await Admin.findOne({ id }).lean();
    }
    if (!user && (id.startsWith('COMP-') || id.startsWith('comp-'))) {
      logger.info(`EmployeesRepository::findOne user not found, querying company with ID: ${id}`);
      const company = await Company.findOne({ id }).lean();
      if (company) {
        user = {
          ...company,
          roleId: 'company_admin',
          role: 'CompanyAdmin',
          companyId: company.id
        };
      }
    }
    return user;
  };

  let user;
  if (companyId) {
    const cacheKey = CacheKeys.user(companyId, id);
    user = await cacheGetOrSet(cacheKey, fetchUser, TTL.USER_PROFILE);
  } else {
    user = await fetchUser();
  }

  // Enforce repository scope validation for standard Employee records
  if (user && user.roleId !== 'company_admin' && user.roleId !== 'super_admin' && user.branch !== undefined) {
    if (context) {
      await validateRepositoryAccess('read', user, {
        ownerIdFields: ['id'],
        moduleName: 'Employee'
      });
    }
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] EmployeesRepository::findOne:
    - ID: ${id}
    - Security Context: ${JSON.stringify(context || {})}
    - Final Mongo Query: { id: "${id}" }
    - Decision: APPROVED`);
  }

  return user;
};

/**
 * Save/Create a new employee record
 * @param {Object} data - Employee data object
 */
export const save = async (data) => {
  logger.info(`EmployeesRepository::save creating employee: ${data.name}`);
  const context = resolveSecurityContext();

  // Validate that user is allowed to create this employee under the specified branch/department scope
  if (context) {
    await validateRepositoryAccess('create', data, {
      ownerIdFields: [],
      moduleName: 'Employee'
    });
  }

  const processedData = await processEmployeeAssets(data);
  const isHrRole = processedData.roleId?.toLowerCase().includes('hr') || processedData.role?.toLowerCase().includes('hr');
  if (isHrRole) {
    processedData.department = '—';
    processedData.teamLeader = '—';
    processedData.team = '—';
  }
  const employee = await Employee.create(processedData);
  try {
    const { registerTenantUser } = await import('../../utils/tenantRegistry.js');
    await registerTenantUser(employee.email, employee.companyId, 'employee');
  } catch (err) {
    logger.error('Error registering tenant user in registry:', err);
  }
  
  // Passively sync stored branch/department counts
  syncBranchDeptCounts(employee.companyId, [employee.branch], [employee.department]);

  // Invalidate cache
  cacheDel(CacheKeys.empList(employee.companyId)).catch(() => {});

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] EmployeesRepository::save:
    - Input: ${JSON.stringify(data)}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return employee;
};

/**
 * Update an existing employee record
 * @param {String} id - Employee business ID
 * @param {Object} data - Updated employee fields
 */
export const update = async (id, data) => {
  logger.info(`EmployeesRepository::update updating employee with ID: ${id}`);
  const context = resolveSecurityContext();

  // Fetch the existing employee record to validate scope
  const oldEmployee = await Employee.findOne({ id }).lean();

  if (oldEmployee) {
    if (context) {
      await validateRepositoryAccess('update', oldEmployee, {
        ownerIdFields: ['id'],
        updatePayload: data,
        moduleName: 'Employee'
      });
    }
  }

  // Also validate that the update payload does not move the employee outside the user's scope
  if (context) {
    if (data.branch !== undefined || data.department !== undefined) {
      const mergedPayload = { ...oldEmployee, ...data };
      await validateRepositoryAccess('update', mergedPayload, {
        ownerIdFields: ['id'],
        moduleName: 'Employee'
      });
    }
  }

  const updateData = await processEmployeeAssets(data);
  const isHrRole = updateData.roleId?.toLowerCase().includes('hr') || updateData.role?.toLowerCase().includes('hr') || (oldEmployee && (oldEmployee.roleId?.toLowerCase().includes('hr') || oldEmployee.role?.toLowerCase().includes('hr')));
  if (isHrRole) {
    updateData.department = '—';
    updateData.teamLeader = '—';
    updateData.team = '—';
  }
  if (updateData.password === '••••••••' || !updateData.password) {
    delete updateData.password;
  } else {
    // If it's a new password, hash it!
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(updateData.password, salt);
  }
  
  let updated = await Employee.findOneAndUpdate({ id }, updateData, { new: true, runValidators: true });
  
  if (updated && oldEmployee && oldEmployee.email !== updated.email) {
    try {
      const { updateTenantUserEmail } = await import('../../utils/tenantRegistry.js');
      await updateTenantUserEmail(oldEmployee.email, updated.email);
    } catch (err) {
      logger.error('Error updating tenant user email in registry:', err);
    }
  } else if (updated) {
    try {
      const { registerTenantUser } = await import('../../utils/tenantRegistry.js');
      await registerTenantUser(updated.email, updated.companyId, updated.roleId === 'company_admin' ? 'company_admin' : 'employee');
    } catch (err) {
      logger.error('Error upserting tenant user in registry:', err);
    }
  }
  
  if (!updated) {
    logger.info(`EmployeesRepository::update employee not found, trying admin update for ID: ${id}`);
    updated = await Admin.findOneAndUpdate({ id }, updateData, { new: true, runValidators: true });
  }
  if (!updated && (id.startsWith('COMP-') || id.startsWith('comp-'))) {
    logger.info(`EmployeesRepository::update user not found, trying company update for ID: ${id}`);
    const cleanData = { ...updateData };
    const updatePayload = {};
    if (cleanData.settings) {
      Object.keys(cleanData.settings).forEach(key => {
        updatePayload[`settings.${key}`] = cleanData.settings[key];
      });
      delete cleanData.settings;
    }
    Object.keys(cleanData).forEach(key => {
      updatePayload[key] = cleanData[key];
    });

    updated = await Company.findOneAndUpdate({ id }, { $set: updatePayload }, { new: true, runValidators: true });
    if (updated) {
      updated = updated.toObject ? updated.toObject() : updated;
      updated.roleId = 'company_admin';
      updated.role = 'CompanyAdmin';
      updated.companyId = updated.id;
    }
  }

  // Passively sync stored branch/department counts for old and new values
  if (updated) {
    const affectedBranches = [updated.branch, oldEmployee?.branch].filter(Boolean);
    const affectedDepts = [updated.department, oldEmployee?.department].filter(Boolean);
    syncBranchDeptCounts(updated.companyId, affectedBranches, affectedDepts);

    // Invalidate cache
    const companyId = updated.companyId || getTenantId();
    if (companyId) {
      cacheDel(
        CacheKeys.user(companyId, id),
        CacheKeys.empList(companyId)
      ).catch(() => {});
    }
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] EmployeesRepository::update:
    - ID: ${id}
    - Update Payload: ${JSON.stringify(data)}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return updated;
};

/**
 * Remove/delete an employee record
 * @param {String} id - Employee business ID
 */
export const remove = async (id) => {
  logger.info(`EmployeesRepository::remove deleting employee with ID: ${id}`);
  const context = resolveSecurityContext();

  const employee = await Employee.findOne({ id }).lean();
  if (employee) {
    if (context) {
      await validateRepositoryAccess('delete', employee, {
        ownerIdFields: ['id'],
        moduleName: 'Employee'
      });
    }
  }

  const deleted = await Employee.findOneAndDelete({ id });
  if (deleted && employee) {
    try {
      const { unregisterTenantUser } = await import('../../utils/tenantRegistry.js');
      await unregisterTenantUser(employee.email);
    } catch (err) {
      logger.error('Error unregistering tenant user in registry:', err);
    }
  }
  // Passively sync stored branch/department counts after deletion
  if (employee) {
    syncBranchDeptCounts(employee.companyId, [employee.branch], [employee.department]);

    // Invalidate cache
    const companyId = employee.companyId || getTenantId();
    if (companyId) {
      cacheDel(
        CacheKeys.user(companyId, id),
        CacheKeys.empList(companyId)
      ).catch(() => {});
    }
  }

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] EmployeesRepository::remove:
    - ID: ${id}
    - Security Context: ${JSON.stringify(context || {})}
    - Decision: APPROVED`);
  }

  return deleted;
};

/**
 * Direct avatar update — bypasses repositoryContract security entirely.
 * The controller layer is responsible for ownership verification before calling this.
 * Only updates avatar and photoUrl fields.
 */
export const updateAvatarDirect = async (id, payload) => {
  const tenantId = getTenantId();
  if (!tenantId) {
    const err = new Error('Tenant context is missing.');
    err.statusCode = 400;
    throw err;
  }

  const safeUpdate = {};
  if (payload.avatar) safeUpdate.avatar = payload.avatar;
  if (payload.photoUrl) safeUpdate.photoUrl = payload.photoUrl;

  const updated = await Employee.findOneAndUpdate(
    { companyId: tenantId, id },
    { $set: safeUpdate },
    { new: true }
  ).lean();

  if (!updated) {
    const err = new Error('Employee not found.');
    err.statusCode = 404;
    throw err;
  }

  logger.info(`[AvatarUpdate] Employee ${id} avatar updated directly.`);

  // Bust both the cached user profile and the cached employee list so next fetch is fresh
  cacheDel(
    CacheKeys.user(tenantId, id),
    CacheKeys.empList(tenantId)
  ).catch(() => {});

  return updated;
};

export default {
  find,
  findOne,
  save,
  update,
  remove,
  updateAvatarDirect
};



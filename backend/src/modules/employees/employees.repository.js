/**
 * @file src/modules/employees/employees.repository.js
 * @description Data Access layer for Employees module using Mongoose model.
 */

import Employee from './employees.model.js';
import Admin from '../admin/admin.model.js';
import Company from '../companies/company.model.js';
import logger from '../../config/logger.js';
import { processEmployeeAssets } from '../../utils/imagekit.js';

/**
 * Find all employees matching optional query filters
 * @param {Object} query - MongoDB query filters
 */
export const find = async (query = {}) => {
  logger.info('EmployeesRepository::find querying employees from database...');
  return Employee.find(query)
    .select('-attendanceHistory -overtimeHistory -leaveHistory -taskHistory -activityLog -documents')
    .lean();
};

/**
 * Find a single employee by their business ID
 * @param {String} id - Employee business ID (e.g. EMP-2026-001)
 */
export const findOne = async (id) => {
  logger.info(`EmployeesRepository::findOne querying employee with ID: ${id}`);
  let user = await Employee.findOne({ id });
  if (!user) {
    logger.info(`EmployeesRepository::findOne employee not found, querying admin with ID: ${id}`);
    user = await Admin.findOne({ id });
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

/**
 * Save/Create a new employee record
 * @param {Object} data - Employee data object
 */
export const save = async (data) => {
  logger.info(`EmployeesRepository::save creating employee: ${data.name}`);
  const processedData = await processEmployeeAssets(data);
  const employee = await Employee.create(processedData);
  try {
    const { registerTenantUser } = await import('../../utils/tenantRegistry.js');
    await registerTenantUser(employee.email, employee.companyId, 'employee');
  } catch (err) {
    logger.error('Error registering tenant user in registry:', err);
  }
  return employee;
};

import bcrypt from 'bcryptjs';

/**
 * Update an existing employee record
 * @param {String} id - Employee business ID
 * @param {Object} data - Updated employee fields
 */
export const update = async (id, data) => {
  logger.info(`EmployeesRepository::update updating employee with ID: ${id}`);
  const updateData = await processEmployeeAssets(data);
  if (updateData.password === '••••••••' || !updateData.password) {
    delete updateData.password;
  } else {
    // If it's a new password, hash it!
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(updateData.password, salt);
  }
  
  const oldEmployee = await Employee.findOne({ id }).lean();
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
  return updated;
};

/**
 * Remove/delete an employee record
 * @param {String} id - Employee business ID
 */
export const remove = async (id) => {
  logger.info(`EmployeesRepository::remove deleting employee with ID: ${id}`);
  const employee = await Employee.findOne({ id }).lean();
  const deleted = await Employee.findOneAndDelete({ id });
  if (deleted && employee) {
    try {
      const { unregisterTenantUser } = await import('../../utils/tenantRegistry.js');
      await unregisterTenantUser(employee.email);
    } catch (err) {
      logger.error('Error unregistering tenant user in registry:', err);
    }
  }
  return deleted;
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

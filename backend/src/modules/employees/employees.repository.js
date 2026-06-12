/**
 * @file src/modules/employees/employees.repository.js
 * @description Data Access layer for Employees module using Mongoose model.
 */

import Employee from './employees.model.js';
import Admin from '../admin/admin.model.js';
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
  return user;
};

/**
 * Save/Create a new employee record
 * @param {Object} data - Employee data object
 */
export const save = async (data) => {
  logger.info(`EmployeesRepository::save creating employee: ${data.name}`);
  const processedData = await processEmployeeAssets(data);
  return Employee.create(processedData);
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
  
  let updated = await Employee.findOneAndUpdate({ id }, updateData, { new: true, runValidators: true });
  if (!updated) {
    logger.info(`EmployeesRepository::update employee not found, trying admin update for ID: ${id}`);
    updated = await Admin.findOneAndUpdate({ id }, updateData, { new: true, runValidators: true });
  }
  return updated;
};

/**
 * Remove/delete an employee record
 * @param {String} id - Employee business ID
 */
export const remove = async (id) => {
  logger.info(`EmployeesRepository::remove deleting employee with ID: ${id}`);
  return Employee.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

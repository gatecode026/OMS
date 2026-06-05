/**
 * @file src/modules/employees/employees.repository.js
 * @description Data Access layer for Employees module using Mongoose model.
 */

import Employee from './employees.model.js';
import logger from '../../config/logger.js';

/**
 * Find all employees matching optional query filters
 * @param {Object} query - MongoDB query filters
 */
export const find = async (query = {}) => {
  logger.info('EmployeesRepository::find querying employees from database...');
  return Employee.find(query);
};

/**
 * Find a single employee by their business ID
 * @param {String} id - Employee business ID (e.g. EMP-2026-001)
 */
export const findOne = async (id) => {
  logger.info(`EmployeesRepository::findOne querying employee with ID: ${id}`);
  return Employee.findOne({ id });
};

/**
 * Save/Create a new employee record
 * @param {Object} data - Employee data object
 */
export const save = async (data) => {
  logger.info(`EmployeesRepository::save creating employee: ${data.name}`);
  return Employee.create(data);
};

/**
 * Update an existing employee record
 * @param {String} id - Employee business ID
 * @param {Object} data - Updated employee fields
 */
export const update = async (id, data) => {
  logger.info(`EmployeesRepository::update updating employee with ID: ${id}`);
  return Employee.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
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

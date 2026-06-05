/**
 * @file src/modules/departments/departments.repository.js
 * @description Data Access layer for Departments module using MongoDB.
 */

import Department from './departments.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('DepartmentsRepository::find querying departments from database...');
  return Department.find(query);
};

export const findOne = async (id) => {
  logger.info(`DepartmentsRepository::findOne querying department with ID: ${id}`);
  return Department.findOne({ id });
};

export const save = async (data) => {
  logger.info(`DepartmentsRepository::save creating department: ${data.name}`);
  
  // Assign a default rotating accent color automatically since the picker was removed
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
  const count = await Department.countDocuments();
  if (!data.color) {
    data.color = colors[count % colors.length];
  }
  
  return Department.create(data);
};

export const update = async (id, data) => {
  logger.info(`DepartmentsRepository::update updating department with ID: ${id}`);
  return Department.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const remove = async (id) => {
  logger.info(`DepartmentsRepository::remove deleting department with ID: ${id}`);
  return Department.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

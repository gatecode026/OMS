/**
 * @file src/modules/departments/departments.service.js
 * @description Service business logic for Departments module.
 */

import repository from './departments.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing DepartmentsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing DepartmentsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing DepartmentsService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing DepartmentsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing DepartmentsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

/**
 * @file src/modules/leaves/leaves.service.js
 * @description Service business logic for Leaves module.
 */

import repository from './leaves.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing LeavesService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing LeavesService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing LeavesService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing LeavesService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing LeavesService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

/**
 * @file src/modules/branches/branches.service.js
 * @description Service business logic for Branches module.
 */

import repository from './branches.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing BranchesService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing BranchesService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing BranchesService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing BranchesService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing BranchesService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

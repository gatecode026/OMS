/**
 * @file src/modules/workflows/workflows.service.js
 * @description Service business logic for Workflows module.
 */

import repository from './workflows.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing WorkflowsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing WorkflowsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing WorkflowsService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing WorkflowsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing WorkflowsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

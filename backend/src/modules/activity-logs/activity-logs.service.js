/**
 * @file src/modules/activity-logs/activity-logs.service.js
 * @description Service business logic for ActivityLogs module.
 */

import repository from './activity-logs.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing ActivityLogsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing ActivityLogsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing ActivityLogsService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing ActivityLogsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing ActivityLogsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

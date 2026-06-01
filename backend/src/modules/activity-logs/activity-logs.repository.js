/**
 * @file src/modules/activity-logs/activity-logs.repository.js
 * @description Data Access layer for ActivityLogs module.
 */

import logger from '../../config/logger.js';

export const find = async (query) => {
  logger.debug('Executing ActivityLogsRepository::find placeholder');
  return [
    { id: 'MOCK-1', name: 'Placeholder Domain Record 1 for ActivityLogs', status: 'Active' },
    { id: 'MOCK-2', name: 'Placeholder Domain Record 2 for ActivityLogs', status: 'Inactive' }
  ];
};

export const findOne = async (id) => {
  logger.debug('Executing ActivityLogsRepository::findOne placeholder for: ' + id);
  return { id, name: 'Placeholder Single Domain Record for ActivityLogs', status: 'Active' };
};

export const save = async (data) => {
  logger.debug('Executing ActivityLogsRepository::save placeholder', data);
  return { id: 'MOCK-' + Math.floor(100 + Math.random() * 900), ...data };
};

export const update = async (id, data) => {
  logger.debug('Executing ActivityLogsRepository::update placeholder for: ' + id, data);
  return { id, ...data };
};

export const remove = async (id) => {
  logger.debug('Executing ActivityLogsRepository::remove placeholder for: ' + id);
  return { id, status: 'Deleted' };
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

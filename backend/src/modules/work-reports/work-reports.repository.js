/**
 * @file src/modules/work-reports/work-reports.repository.js
 * @description Data Access layer for WorkReports module.
 */

import logger from '../../config/logger.js';

export const find = async (query) => {
  logger.debug('Executing WorkReportsRepository::find placeholder');
  return [
    { id: 'MOCK-1', name: 'Placeholder Domain Record 1 for WorkReports', status: 'Active' },
    { id: 'MOCK-2', name: 'Placeholder Domain Record 2 for WorkReports', status: 'Inactive' }
  ];
};

export const findOne = async (id) => {
  logger.debug('Executing WorkReportsRepository::findOne placeholder for: ' + id);
  return { id, name: 'Placeholder Single Domain Record for WorkReports', status: 'Active' };
};

export const save = async (data) => {
  logger.debug('Executing WorkReportsRepository::save placeholder', data);
  return { id: 'MOCK-' + Math.floor(100 + Math.random() * 900), ...data };
};

export const update = async (id, data) => {
  logger.debug('Executing WorkReportsRepository::update placeholder for: ' + id, data);
  return { id, ...data };
};

export const remove = async (id) => {
  logger.debug('Executing WorkReportsRepository::remove placeholder for: ' + id);
  return { id, status: 'Deleted' };
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

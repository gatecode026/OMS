/**
 * @file src/modules/work-reports/work-reports.service.js
 * @description Service business logic for WorkReports module.
 */

import repository from './work-reports.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing WorkReportsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing WorkReportsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing WorkReportsService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing WorkReportsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing WorkReportsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

/**
 * @file src/modules/payroll/payroll.service.js
 * @description Service business logic for Payroll module.
 */

import repository from './payroll.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing PayrollService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing PayrollService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing PayrollService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing PayrollService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing PayrollService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

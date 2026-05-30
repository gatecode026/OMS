/**
 * @file src/modules/payroll/payroll.repository.js
 * @description Data Access layer for Payroll module.
 */

import logger from '../../config/logger.js';

export const find = async (query) => {
  logger.debug('Executing PayrollRepository::find placeholder');
  return [
    { id: 'MOCK-1', name: 'Placeholder Domain Record 1 for Payroll', status: 'Active' },
    { id: 'MOCK-2', name: 'Placeholder Domain Record 2 for Payroll', status: 'Inactive' }
  ];
};

export const findOne = async (id) => {
  logger.debug('Executing PayrollRepository::findOne placeholder for: ' + id);
  return { id, name: 'Placeholder Single Domain Record for Payroll', status: 'Active' };
};

export const save = async (data) => {
  logger.debug('Executing PayrollRepository::save placeholder', data);
  return { id: 'MOCK-' + Math.floor(100 + Math.random() * 900), ...data };
};

export const update = async (id, data) => {
  logger.debug('Executing PayrollRepository::update placeholder for: ' + id, data);
  return { id, ...data };
};

export const remove = async (id) => {
  logger.debug('Executing PayrollRepository::remove placeholder for: ' + id);
  return { id, status: 'Deleted' };
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

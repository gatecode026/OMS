/**
 * @file src/modules/auth/auth.repository.js
 * @description Data Access layer for Auth module.
 */

import logger from '../../config/logger.js';

export const find = async (query) => {
  logger.debug('Executing AuthRepository::find placeholder');
  return [
    { id: 'MOCK-1', name: 'Placeholder Domain Record 1 for Auth', status: 'Active' },
    { id: 'MOCK-2', name: 'Placeholder Domain Record 2 for Auth', status: 'Inactive' }
  ];
};

export const findOne = async (id) => {
  logger.debug('Executing AuthRepository::findOne placeholder for: ' + id);
  return { id, name: 'Placeholder Single Domain Record for Auth', status: 'Active' };
};

export const save = async (data) => {
  logger.debug('Executing AuthRepository::save placeholder', data);
  return { id: 'MOCK-' + Math.floor(100 + Math.random() * 900), ...data };
};

export const update = async (id, data) => {
  logger.debug('Executing AuthRepository::update placeholder for: ' + id, data);
  return { id, ...data };
};

export const remove = async (id) => {
  logger.debug('Executing AuthRepository::remove placeholder for: ' + id);
  return { id, status: 'Deleted' };
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

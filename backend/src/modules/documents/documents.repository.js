/**
 * @file src/modules/documents/documents.repository.js
 * @description Data Access layer for Documents module.
 */

import logger from '../../config/logger.js';

export const find = async (query) => {
  logger.debug('Executing DocumentsRepository::find placeholder');
  return [
    { id: 'MOCK-1', name: 'Placeholder Domain Record 1 for Documents', status: 'Active' },
    { id: 'MOCK-2', name: 'Placeholder Domain Record 2 for Documents', status: 'Inactive' }
  ];
};

export const findOne = async (id) => {
  logger.debug('Executing DocumentsRepository::findOne placeholder for: ' + id);
  return { id, name: 'Placeholder Single Domain Record for Documents', status: 'Active' };
};

export const save = async (data) => {
  logger.debug('Executing DocumentsRepository::save placeholder', data);
  return { id: 'MOCK-' + Math.floor(100 + Math.random() * 900), ...data };
};

export const update = async (id, data) => {
  logger.debug('Executing DocumentsRepository::update placeholder for: ' + id, data);
  return { id, ...data };
};

export const remove = async (id) => {
  logger.debug('Executing DocumentsRepository::remove placeholder for: ' + id);
  return { id, status: 'Deleted' };
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

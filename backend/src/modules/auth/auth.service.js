/**
 * @file src/modules/auth/auth.service.js
 * @description Service business logic for Auth module.
 */

import repository from './auth.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing AuthService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing AuthService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing AuthService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing AuthService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing AuthService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

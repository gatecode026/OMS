/**
 * @file src/modules/documents/documents.service.js
 * @description Service business logic for Documents module.
 */

import repository from './documents.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing DocumentsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing DocumentsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing DocumentsService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing DocumentsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing DocumentsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

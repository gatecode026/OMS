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
  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }
  // Check permission: super_admin can delete anything, others can only delete their own uploaded documents
  if (currentUser?.role !== 'super_admin' && doc.uploadedBy !== currentUser?.name) {
    const error = new Error('You do not have permission to delete this document');
    error.statusCode = 403;
    throw error;
  }
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

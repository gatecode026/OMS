/**
 * @file src/modules/projects/projects.service.js
 * @description Service business logic for Projects module.
 */

import repository from './projects.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing ProjectsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing ProjectsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing ProjectsService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing ProjectsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing ProjectsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

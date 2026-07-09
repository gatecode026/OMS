/**
 * @file src/modules/tasks/tasks.service.js
 * @description Service business logic for Tasks module.
 */

import repository from './tasks.repository.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';

export const findAll = async (query) => {
  logger.info('Executing TasksService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing TasksService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing TasksService::createRecord by user: ' + currentUser?.id);
  const record = await repository.save(data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'tasks',
      action: 'create',
      data: record
    });
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing TasksService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.update(id, data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'tasks',
      action: 'update',
      data: record
    });
  }
  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing TasksService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.remove(id);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'tasks',
      action: 'delete',
      data: id
    });
  }
  return record;
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

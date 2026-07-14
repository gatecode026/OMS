/**
 * @file src/modules/departments/departments.service.js
 * @description Service business logic for Departments module.
 */

import repository from './departments.repository.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';

export const findAll = async (query) => {
  logger.info('Executing DepartmentsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing DepartmentsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing DepartmentsService::createRecord by user: ' + currentUser?.id);
  const record = await repository.save(data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'departments',
      action: 'create',
      data: record
    });
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing DepartmentsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.update(id, data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'departments',
      action: 'update',
      data: record
    });
  }
  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing DepartmentsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.remove(id);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'departments',
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

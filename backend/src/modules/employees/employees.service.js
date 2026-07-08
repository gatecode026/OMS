/**
 * @file src/modules/employees/employees.service.js
 * @description Service business logic for Employees module.
 */

import repository from './employees.repository.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';

export const findAll = async (query) => {
  logger.info('Executing EmployeesService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing EmployeesService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing EmployeesService::createRecord by user: ' + currentUser?.id);
  
  // Enforce country default
  data.country = 'India';

  // Always strip the frontend-supplied id – the backend generates a company-scoped one
  delete data.id;

  // Check username uniqueness
  if (data.username) {
    const existing = await repository.find({ username: { $regex: new RegExp(`^${data.username.trim()}$`, 'i') } });
    if (existing && existing.length > 0) {
      const err = new Error('Username already exists');
      err.statusCode = 400;
      throw err;
    }
  }

  const record = await repository.save(data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'employees',
      action: 'create',
      data: record
    });
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing EmployeesService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);

  // Enforce country default
  if (data.country !== undefined) {
    data.country = 'India';
  }

  // Check username uniqueness
  if (data.username) {
    const existing = await repository.find({
      username: { $regex: new RegExp(`^${data.username.trim()}$`, 'i') },
      id: { $ne: id }
    });
    if (existing && existing.length > 0) {
      const err = new Error('Username already exists');
      err.statusCode = 400;
      throw err;
    }
  }

  const record = await repository.update(id, data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'employees',
      action: 'update',
      data: record
    });
  }
  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing EmployeesService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.remove(id);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'employees',
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

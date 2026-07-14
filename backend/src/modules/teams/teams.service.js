/**
 * @file src/modules/teams/teams.service.js
 * @description Service business logic for Teams module.
 */

import repository from './teams.repository.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';

export const findAll = async (query) => {
  logger.info('Executing TeamsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing TeamsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing TeamsService::createRecord by user: ' + currentUser?.id);
  const record = await repository.save(data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'teams',
      action: 'create',
      data: record
    });
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing TeamsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.update(id, data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'teams',
      action: 'update',
      data: record
    });
  }
  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing TeamsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.remove(id);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'teams',
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

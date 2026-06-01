/**
 * @file src/modules/teams/teams.repository.js
 * @description Data Access layer for Teams module.
 */

import logger from '../../config/logger.js';

export const find = async (query) => {
  logger.debug('Executing TeamsRepository::find placeholder');
  return [
    { id: 'MOCK-1', name: 'Placeholder Domain Record 1 for Teams', status: 'Active' },
    { id: 'MOCK-2', name: 'Placeholder Domain Record 2 for Teams', status: 'Inactive' }
  ];
};

export const findOne = async (id) => {
  logger.debug('Executing TeamsRepository::findOne placeholder for: ' + id);
  return { id, name: 'Placeholder Single Domain Record for Teams', status: 'Active' };
};

export const save = async (data) => {
  logger.debug('Executing TeamsRepository::save placeholder', data);
  return { id: 'MOCK-' + Math.floor(100 + Math.random() * 900), ...data };
};

export const update = async (id, data) => {
  logger.debug('Executing TeamsRepository::update placeholder for: ' + id, data);
  return { id, ...data };
};

export const remove = async (id) => {
  logger.debug('Executing TeamsRepository::remove placeholder for: ' + id);
  return { id, status: 'Deleted' };
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

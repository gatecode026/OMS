/**
 * @file src/modules/holidays/holidays.service.js
 * @description Service business logic for Holidays module.
 */

import repository from './holidays.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing HolidaysService::findAll query');
  return repository.find(query);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing HolidaysService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing HolidaysService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  createRecord,
  deleteRecord
};

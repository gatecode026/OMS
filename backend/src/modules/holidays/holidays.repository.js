/**
 * @file src/modules/holidays/holidays.repository.js
 * @description Data Access layer for Holidays module.
 */

import Holiday from './holidays.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.debug('Executing HolidaysRepository::find', query);
  const filters = {};
  if (query.type) filters.type = query.type;
  
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filters.$or = [
      { name: regex },
      { description: regex }
    ];
  }
  
  return Holiday.find(filters).sort({ date: 1 });
};

export const save = async (data) => {
  logger.debug('Executing HolidaysRepository::save', data);
  const id = data.id || `HOL-${Date.now()}`;
  return Holiday.create({ ...data, id });
};

export const remove = async (id) => {
  logger.debug('Executing HolidaysRepository::remove for ID: ' + id);
  return Holiday.findOneAndDelete({ id });
};

export default {
  find,
  save,
  remove
};

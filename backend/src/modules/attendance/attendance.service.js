/**
 * @file src/modules/attendance/attendance.service.js
 * @description Service business logic for Attendance module.
 */

import repository from './attendance.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing AttendanceService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing AttendanceService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing AttendanceService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing AttendanceService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing AttendanceService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

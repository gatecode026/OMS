/**
 * @file src/modules/attendance/attendance.repository.js
 * @description Data Access layer for Attendance module.
 */

import Attendance from './attendance.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.debug('Executing AttendanceRepository::find', query);
  const filters = {};
  if (query.employeeId) filters.employeeId = query.employeeId;
  if (query.from && query.to) {
    filters.date = { $gte: query.from, $lte: query.to };
  } else if (query.date) {
    filters.date = query.date;
  }
  if (query.branch) filters.branch = query.branch;
  if (query.department) filters.department = query.department;
  if (query.status) filters.status = query.status;
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filters.$or = [
      { employeeName: regex },
      { employeeId: regex },
      { department: regex }
    ];
  }
  return Attendance.find(filters).sort({ date: -1, createdAt: -1 });
};

export const findOne = async (id) => {
  logger.debug('Executing AttendanceRepository::findOne for ID: ' + id);
  return Attendance.findOne({ id });
};

export const save = async (data) => {
  logger.debug('Executing AttendanceRepository::save', data);
  const id = data.id || `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return Attendance.create({ ...data, id });
};

export const update = async (id, data) => {
  logger.debug('Executing AttendanceRepository::update for ID: ' + id, data);
  return Attendance.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.debug('Executing AttendanceRepository::remove for ID: ' + id);
  return Attendance.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

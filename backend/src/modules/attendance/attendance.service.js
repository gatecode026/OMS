/**
 * @file src/modules/attendance/attendance.service.js
 * @description Service business logic for Attendance module.
 */

import repository from './attendance.repository.js';
import logger from '../../config/logger.js';
import Notification from '../notifications/notification.model.js';

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
  const record = await repository.save(data);
  if (record) {
    try {
      const notifId = `NTF-${Math.floor(100000 + Math.random() * 900000)}`;
      await Notification.create({
        id: notifId,
        type: 'attendance',
        title: 'Employee Punched In',
        message: `${record.employeeName} (${record.department}) punched in at ${record.punchIn} on ${record.date} (${record.workMode || 'Office'}).${record.notes ? ' Notes: ' + record.notes : ''}`,
        time: 'Just now',
        category: 'Attendance',
        priority: 'Normal',
        recipientType: 'super_admin',
        sentBy: record.employeeName || 'System',
        sentDate: new Date().toISOString().split('T')[0],
        deliveryStatus: 'Delivered',
        readStatus: 'Unread',
        recipients: 1
      });
      logger.info(`Notification generated successfully for attendance punch-in: ${notifId}`);
    } catch (err) {
      logger.error('Error generating notification for attendance punch-in: ' + err.message);
    }
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing AttendanceService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.update(id, data);
  if (record) {
    try {
      const notifId = `NTF-${Math.floor(100000 + Math.random() * 900000)}`;
      await Notification.create({
        id: notifId,
        type: 'attendance',
        title: 'Employee Punched Out',
        message: `${record.employeeName} (${record.department}) punched out at ${record.punchOut} on ${record.date}. Total Hours: ${record.totalHours} hrs.${record.notes ? ' Notes: ' + record.notes : ''}`,
        time: 'Just now',
        category: 'Attendance',
        priority: 'Normal',
        recipientType: 'super_admin',
        sentBy: record.employeeName || 'System',
        sentDate: new Date().toISOString().split('T')[0],
        deliveryStatus: 'Delivered',
        readStatus: 'Unread',
        recipients: 1
      });
      logger.info(`Notification generated successfully for attendance punch-out: ${notifId}`);
    } catch (err) {
      logger.error('Error generating notification for attendance punch-out: ' + err.message);
    }
  }
  return record;
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

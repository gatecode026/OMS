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

export const findToday = async (employeeId) => {
  logger.info('Executing AttendanceService::findToday query for employee: ' + employeeId);
  const todayStr = new Date().toISOString().split('T')[0];
  const records = await repository.find({ employeeId, date: todayStr });
  return records[0] || null;
};

export const findSummary = async (employeeId, month) => {
  logger.info(`Executing AttendanceService::findSummary query for employee: ${employeeId}, month: ${month}`);
  // month is formatted as 'YYYY-MM'
  const from = `${month}-01`;
  const to = `${month}-31`; // mongo will compare string gte/lte lexicographically, which works for 31 days.
  const records = await repository.find({ employeeId, from, to });
  
  const presentDays = records.filter(r => r.status === 'Present' || r.status === 'Work From Home' || r.status === 'WFH').length;
  const absentDays = records.filter(r => r.status === 'Absent').length;
  const lateDays = records.filter(r => r.status === 'Late').length;
  
  const hoursRecords = records.filter(r => r.totalHours > 0);
  const avgHours = hoursRecords.length > 0 
    ? parseFloat((hoursRecords.reduce((sum, r) => sum + r.totalHours, 0) / hoursRecords.length).toFixed(1))
    : 0;
    
  return {
    presentDays,
    absentDays,
    lateDays,
    avgHours,
    totalWorkingDays: 22
  };
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
  findToday,
  findSummary
};

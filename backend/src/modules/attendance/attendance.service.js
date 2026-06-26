/**
 * @file src/modules/attendance/attendance.service.js
 * @description Service business logic for Attendance module.
 */

import repository from './attendance.repository.js';
import logger from '../../config/logger.js';
import { createNotification } from '../notifications/notifications.service.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';

const notifyAdminsAndManagers = async (companyId, title, message, data = {}) => {
  try {
    // 1. Notify company admin (whose user ID is companyId)
    await createNotification(companyId, companyId, {
      type: 'attendance',
      title,
      message,
      data,
      priority: 'normal'
    });

    // 2. Query and notify other managers/HR/admins in that company
    const conn = await getTenantConnection(companyId);
    const managers = await conn.collection('employees').find({
      roleId: { $in: ['manager', 'hr', 'admin'] },
      status: 'Active'
    }).toArray();

    for (const manager of managers) {
      if (manager.id && manager.id !== companyId) {
        await createNotification(manager.id, companyId, {
          type: 'attendance',
          title,
          message,
          data,
          priority: 'normal'
        });
      }
    }
  } catch (err) {
    logger.error('Error notifying admins and managers: ' + err.message);
  }
};

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
    const title = 'Employee Punched In';
    const message = `${record.employeeName} (${record.department}) punched in at ${record.punchIn} on ${record.date} (${record.workMode || 'Office'}).${record.notes ? ' Notes: ' + record.notes : ''}`;
    await notifyAdminsAndManagers(currentUser.companyId, title, message, { attendanceId: record.id });
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing AttendanceService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.update(id, data);
  if (record) {
    const title = 'Employee Punched Out';
    const message = `${record.employeeName} (${record.department}) punched out at ${record.punchOut} on ${record.date}. Total Hours: ${record.totalHours} hrs.${record.notes ? ' Notes: ' + record.notes : ''}`;
    await notifyAdminsAndManagers(currentUser.companyId, title, message, { attendanceId: record.id });
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

/**
 * @file src/modules/attendance/attendance.service.js
 * @description Service business logic for Attendance module.
 */

import repository from './attendance.repository.js';
import logger from '../../config/logger.js';
import { createNotification } from '../notifications/notifications.service.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import { runWithTenant } from '../../utils/tenantContext.js';

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

export const qrPunch = async (employeeId, companyId) => {
  logger.info(`Executing AttendanceService::qrPunch for employee: ${employeeId} under company: ${companyId}`);

  return runWithTenant(companyId, async () => {
    const conn = await getTenantConnection(companyId);
    const employee = await conn.collection('employees').findOne({ id: employeeId });
    if (!employee) {
      const err = new Error(`Employee with ID ${employeeId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const currentTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    // Find today's record
    const records = await repository.find({ employeeId, date: todayStr });
    const todayRecord = records[0];

    if (!todayRecord) {
      // 1. PUNCH IN
      const record = await repository.save({
        employeeId,
        employeeName: employee.name,
        department: employee.department,
        branch: employee.branch,
        date: todayStr,
        punchIn: currentTimeStr,
        punchOut: '--:--',
        status: 'Present',
        source: 'QR Code Scanner'
      });

      const title = 'Employee Punched In via QR';
      const message = `${record.employeeName} (${record.department}) punched in via QR at ${record.punchIn} on ${record.date}.`;
      await notifyAdminsAndManagers(companyId, title, message, { attendanceId: record.id });

      return {
        success: true,
        type: 'in',
        punchTime: currentTimeStr,
        employeeName: employee.name,
        message: `PUNCH IN SUCCESSFUL! Welcome ${employee.name} at ${currentTimeStr}.`
      };
    }

    // 2. Already punched out
    if (todayRecord.punchOut && todayRecord.punchOut !== '--:--') {
      return {
        success: false,
        message: `Already punched out for today.`,
        employeeName: employee.name
      };
    }

    // 3. PUNCH OUT (but check 1 hour constraint)
    const punchInTime = new Date(todayRecord.createdAt);
    const now = new Date();
    const diffMs = now - punchInTime;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      return {
        success: false,
        message: `Already punched in. Please scan after 1 hour to punch out. (Punch-in: ${todayRecord.punchIn})`,
        employeeName: employee.name
      };
    }

    // Perform punch out update
    const totalHours = parseFloat(diffHours.toFixed(2));
    const updatedRecord = await repository.update(todayRecord.id, {
      punchOut: currentTimeStr,
      totalHours,
      status: todayRecord.status === 'Late' ? 'Late' : 'Present'
    });

    const title = 'Employee Punched Out via QR';
    const message = `${updatedRecord.employeeName} punched out via QR at ${updatedRecord.punchOut} on ${updatedRecord.date}. Total Hours: ${totalHours} hrs.`;
    await notifyAdminsAndManagers(companyId, title, message, { attendanceId: updatedRecord.id });

    return {
      success: true,
      type: 'out',
      punchTime: currentTimeStr,
      employeeName: employee.name,
      totalHours,
      message: `PUNCH OUT SUCCESSFUL! Goodbye ${employee.name} at ${currentTimeStr}. Total hours: ${totalHours} hrs.`
    };
  });
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
  findToday,
  findSummary,
  qrPunch
};

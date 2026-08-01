/**
 * @file src/modules/attendance/attendance.service.js
 * @description Service business logic for Attendance module.
 */

import repository from './attendance.repository.js';
import logger from '../../config/logger.js';
import { createNotification } from '../notifications/notifications.service.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import { runWithTenant } from '../../utils/tenantContext.js';
import { emitEntitySync } from '../../services/sync.service.js';

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
  
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const currentTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const empId = currentUser?.id || data?.employeeId;

  // Check if today's record already exists to prevent E11000 duplicate key errors
  const existingRecords = await repository.find({ employeeId: empId, date: todayStr });
  if (existingRecords && existingRecords.length > 0) {
    const existing = existingRecords[0];
    logger.info(`Attendance record for ${empId} on ${todayStr} already exists (${existing.id}). Updating existing record.`);
    return updateRecord(existing.id, data, currentUser);
  }

  const enrichedData = {
    employeeId: empId,
    employeeName: currentUser?.name || data?.employeeName || 'Employee',
    department: currentUser?.department || data?.department || 'Operations',
    branch: currentUser?.branch || data?.branch || 'Headquarters',
    date: todayStr,
    punchIn: currentTimeStr,
    punchOut: '--:--',
    status: 'Present',
    source: 'Mobile App',
    ...data
  };

  const record = await repository.save(enrichedData);
  if (record) {
    const title = 'Employee Punched In';
    const message = `${record.employeeName} (${record.department}) punched in at ${record.punchIn} on ${record.date} (${record.workMode || 'Office'}).${record.notes ? ' Notes: ' + record.notes : ''}`;
    await notifyAdminsAndManagers(currentUser.companyId, title, message, { attendanceId: record.id });
    
    if (currentUser?.companyId) {
      emitEntitySync(currentUser.companyId, {
        module: 'attendance',
        action: 'create',
        data: record
      });
    }
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing AttendanceService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);

  let existing = await repository.findOne(id);
  if (!existing && currentUser?.id) {
    existing = await findToday(currentUser.id);
  }
  if (!existing) {
    throw new Error('Attendance record not found');
  }
  id = existing.id || existing._id;

  const d = new Date();
  const currentTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const punchInTime = new Date(existing.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - punchInTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const totalHours = parseFloat(diffHours.toFixed(2));

  const enrichedData = {
    punchOut: currentTimeStr,
    totalHours: totalHours > 0 ? totalHours : 0.01,
    status: existing.status === 'Late' ? 'Late' : 'Present',
    ...data
  };

  const record = await repository.update(id, enrichedData);
  if (record) {
    const title = 'Employee Punched Out';
    const message = `${record.employeeName} (${record.department}) punched out at ${record.punchOut} on ${record.date}. Total Hours: ${record.totalHours} hrs.${record.notes ? ' Notes: ' + record.notes : ''}`;
    await notifyAdminsAndManagers(currentUser.companyId, title, message, { attendanceId: record.id });
    
    if (currentUser?.companyId) {
      emitEntitySync(currentUser.companyId, {
        module: 'attendance',
        action: 'update',
        data: record
      });
    }
  }
  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing AttendanceService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.remove(id);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'attendance',
      action: 'delete',
      data: id
    });
  }
  return record;
};

export const findToday = async (employeeId) => {
  logger.info('Executing AttendanceService::findToday query for employee: ' + employeeId);
  const todayStr = new Date().toISOString().split('T')[0];
  const records = await repository.find({ employeeId, date: todayStr });
  return records[0] || null;
};

export const findSummary = async (employeeId, month, weekendPolicy) => {
  logger.info(`Executing AttendanceService::findSummary query for employee: ${employeeId}, month: ${month}`);
  // month is formatted as 'YYYY-MM'
  const from = `${month}-01`;
  const to = `${month}-31`; // mongo will compare string gte/lte lexicographically, which works for 31 days.
  const records = await repository.find({ employeeId, from, to });
  
  const presentDays = records.filter(r => r.status === 'Present' || r.status === 'Work From Home' || r.status === 'WFH' || r.status === 'Late').length;
  const absentDays = records.filter(r => r.status === 'Absent').length;
  const lateDays = records.filter(r => r.status === 'Late').length;
  
  const hoursRecords = records.filter(r => r.totalHours > 0);
  const avgHours = hoursRecords.length > 0 
    ? parseFloat((hoursRecords.reduce((sum, r) => sum + r.totalHours, 0) / hoursRecords.length).toFixed(1))
    : 0;

  // Calculate totalWorkingDays based on weekendPolicy
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  let weekendDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, monthNum - 1, d).getDay(); // 0=Sun, 6=Sat
    if (weekendPolicy === 'Sunday Only') {
      if (dayOfWeek === 0) weekendDays++;
    } else {
      // Default: 'Saturday & Sunday' or any other value
      if (dayOfWeek === 0 || dayOfWeek === 6) weekendDays++;
    }
  }
  const totalWorkingDays = daysInMonth - weekendDays;
    
  return {
    presentDays,
    absentDays,
    lateDays,
    avgHours,
    totalWorkingDays
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

export const findMonthlyPayrollSummary = async (companyId, monthYear) => {
  logger.info(`Executing AttendanceService::findMonthlyPayrollSummary for company: ${companyId}, month: ${monthYear}`);
  const [year, month] = monthYear.split('-');
  const monthInt = parseInt(month, 10);
  const yearInt = parseInt(year, 10);

  const conn = await getTenantConnection(companyId);
  if (conn.asPromise) {
    await conn.asPromise();
  }
  const totalDaysInMonth = new Date(yearInt, monthInt, 0).getDate();

  const holidays = await conn.collection('holidays').find({
    date: { $regex: new RegExp(`^${year}-${month}`) }
  }).toArray();
  const holidayDates = new Set(holidays.map(h => h.date));

  const settings = await conn.collection('system_settings').findOne({ key: 'global' });
  const weekendPolicy = settings?.payrollRules?.weekendPolicy || 'Saturday & Sunday';

  const employees = await conn.collection('employees').find({ status: 'Active' }).toArray();

  const attendanceRecords = await conn.collection('attendance').find({
    date: { $regex: new RegExp(`^${year}-${month}`) }
  }).toArray();

  const leaves = await conn.collection('leaves').find({
    status: 'Approved',
    isPolicy: { $ne: true },
    $or: [
      { fromDate: { $regex: new RegExp(`^${year}-${month}`) } },
      { toDate: { $regex: new RegExp(`^${year}-${month}`) } }
    ]
  }).toArray();

  const getDatesInRange = (from, to) => {
    const dates = [];
    let start = new Date(from);
    const end = new Date(to || from);
    while (start <= end) {
      dates.push(start.toISOString().split('T')[0]);
      start.setDate(start.getDate() + 1);
    }
    return dates;
  };

  const getIsWeekend = (dateObj, policy) => {
    const day = dateObj.getDay();
    if (policy === 'Sunday Only') {
      return day === 0;
    }
    if (policy === 'Saturday & Sunday') {
      return day === 0 || day === 6;
    }
    return false;
  };

  const payrollSummary = {};

  for (const emp of employees) {
    const empId = emp.id;
    const empAttendance = attendanceRecords.filter(r => r.employeeId === empId);
    const empLeaves = leaves.filter(l => l.employeeId === empId);

    const leaveDayMap = {};
    for (const leave of empLeaves) {
      const dates = getDatesInRange(leave.fromDate, leave.toDate);
      const unpaidCount = leave.unpaidDays || 0;
      const paidCount = Math.max(0, leave.days - unpaidCount);
      dates.forEach((d, idx) => {
        if (d.startsWith(`${year}-${month}`)) {
          if (idx < paidCount) {
            leaveDayMap[d] = 'Paid';
          } else {
            leaveDayMap[d] = 'Unpaid';
          }
        }
      });
    }

    let presentDays = 0;
    let halfDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let holidaysCount = 0;
    let weekendsCount = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      const dateObj = new Date(yearInt, monthInt - 1, day);

      const isWeekend = getIsWeekend(dateObj, weekendPolicy);
      const isHoliday = holidayDates.has(dateStr);

      if (isWeekend) {
        weekendsCount += 1;
        continue;
      }
      if (isHoliday) {
        holidaysCount += 1;
        continue;
      }

      const record = empAttendance.find(r => r.date === dateStr);
      if (record) {
        const status = record.status;
        if (['Present', 'Late', 'Work From Home', 'WFH', 'Overtime'].includes(status)) {
          presentDays += 1;
        } else if (['Half Day', 'Half-Day'].includes(status)) {
          halfDays += 1;
        } else if (['On Leave', 'Leave'].includes(status)) {
          if (leaveDayMap[dateStr] === 'Paid') {
            paidLeaveDays += 1;
          } else if (leaveDayMap[dateStr] === 'Unpaid') {
            unpaidLeaveDays += 1;
          } else {
            paidLeaveDays += 1;
          }
        } else if (status === 'Absent') {
          unpaidLeaveDays += 1;
        }
      } else {
        if (leaveDayMap[dateStr] === 'Paid') {
          paidLeaveDays += 1;
        } else if (leaveDayMap[dateStr] === 'Unpaid') {
          unpaidLeaveDays += 1;
        }
      }
    }

    payrollSummary[empId] = {
      employeeId: empId,
      employeeName: emp.name,
      presentDays,
      halfDays,
      paidLeaveDays,
      unpaidLeaveDays,
      holidays: holidaysCount,
      weekends: weekendsCount
    };
  }

  return payrollSummary;
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
  findToday,
  findSummary,
  qrPunch,
  findMonthlyPayrollSummary
};

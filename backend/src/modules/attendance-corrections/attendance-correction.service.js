/**
 * @file src/modules/attendance-corrections/attendance-correction.service.js
 * @description Service logic for Attendance Correction & Approval Management.
 */

import mongoose from 'mongoose';
import repository from './attendance-correction.repository.js';
import attendanceRepository from '../attendance/attendance.repository.js';
import SystemSettings from '../settings/settings.model.js';
import { PayrollPayment } from '../payroll/payroll.model.js';
import logger from '../../config/logger.js';
import { createNotification } from '../notifications/notifications.service.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import { emitEntitySync } from '../../services/sync.service.js';
import { checkActionPermission } from '../../security/permissionMatrix.js';

// Helpers to format months and times
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const parseTimeToHours = (timeStr) => {
  if (!timeStr || timeStr === '--:--') return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10) || 0;
  const m = parseInt(match[2], 10) || 0;
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h + m / 60;
};

/**
 * Validates if the correction date is locked by a finalized payroll period.
 */
const checkPayrollLock = async (employeeId, dateStr, companyId, userRole) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    const month = MONTHS[date.getMonth()];
    const year = String(date.getFullYear());

    // Search for a processed payment record
    const payment = await PayrollPayment.findOne({ employeeId, month, year, companyId });
    if (!payment) return false;

    // Check if payroll status is finalized (anything except Calculated and Hold)
    const isLockedState = ['HR Verified', 'Finance Approved', 'Released'].includes(payment.status);
    if (isLockedState) {
      // Check if current user is authorized to override/unlock payroll
      const canUnlock = await checkActionPermission('Payroll', userRole, 'update');
      if (!canUnlock) {
        return true; // Locked
      }
    }
    return false;
  } catch (err) {
    logger.error('Error checking payroll lock: ' + err.message);
    return false;
  }
};

/**
 * Validates if correction falls within company's configured window.
 */
const checkCorrectionWindow = async (dateStr, companyId, userRole) => {
  try {
    const settings = await SystemSettings.findOne({ key: 'global', companyId });
    const rules = settings?.attendanceRules || {};
    
    // Default window is 15 days if not set
    const windowSetting = rules.correctionWindow || 15;
    
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today - targetDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (windowSetting === 'current_month') {
      const isSameMonth = targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear();
      if (!isSameMonth && userRole === 'employee') {
        return false; // Out of window for standard employees
      }
    } else {
      const windowDays = parseInt(windowSetting, 10) || 15;
      if (diffDays > windowDays && userRole === 'employee') {
        return false; // Out of window for standard employees
      }
    }
    return true;
  } catch (err) {
    logger.error('Error checking correction window: ' + err.message);
    return true;
  }
};

/**
 * Notifies all users authorized to approve attendance in the company.
 */
const notifyApprovers = async (companyId, title, message, requestData) => {
  try {
    const conn = await getTenantConnection(companyId);
    const employees = await conn.collection('employees').find({
      status: 'Active'
    }).toArray();

    // Parallelize permission checks and notifications creation across approvers
    await Promise.all(
      employees.map(async (emp) => {
        const canApprove = await checkActionPermission('Attendance', emp.roleId || 'employee', 'approve');
        if (canApprove && emp.id) {
          await createNotification(emp.id, companyId, {
            type: 'attendance',
            title,
            message,
            data: { correctionId: requestData.id, employeeId: requestData.employeeId },
            priority: 'normal'
          });
        }
      })
    );
  } catch (err) {
    logger.error('Error notifying approvers: ' + err.message);
  }
};

export const createRequest = async (data, currentUser) => {
  logger.info(`Executing AttendanceCorrectionService::createRequest by: ${currentUser.id}`);

  const { date, requestedStatus } = data;

  // 1. Future date check
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (targetDate > today) {
    const err = new Error('Cannot request attendance correction for future dates.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Prevent duplicate pending requests
  const pending = await repository.find({
    employeeId: currentUser.id,
    date,
    status: 'Pending'
  });
  if (pending.length > 0) {
    const err = new Error('A pending correction request already exists for this date.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Check Correction Window
  const inWindow = await checkCorrectionWindow(date, currentUser.companyId, currentUser.role);
  if (!inWindow) {
    const err = new Error('The attendance correction window for this period has closed.');
    err.statusCode = 400;
    throw err;
  }

  // 4. Check Payroll Lock
  const isLocked = await checkPayrollLock(currentUser.id, date, currentUser.companyId, currentUser.role);
  if (isLocked) {
    const err = new Error('Payroll is locked for this period. Attendance correction requires Payroll Unlock permission.');
    err.statusCode = 403;
    throw err;
  }

  // 5. Query existing attendance record
  const existingRecords = await attendanceRepository.find({
    employeeId: currentUser.id,
    date
  });
  const existing = existingRecords[0];

  const payload = {
    ...data,
    companyId: currentUser.companyId,
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    department: currentUser.department || 'General',
    branch: currentUser.branch || 'Head Office',
    attendanceId: existing?.id || 'NONE',
    currentPunchIn: existing?.punchIn || '--:--',
    currentPunchOut: existing?.punchOut || '--:--',
    currentStatus: existing?.status || 'Absent',
    currentShift: existing?.shift || '',
    currentTotalHours: existing?.totalHours || 0,
    status: 'Pending',
    timeline: [{
      action: 'Submitted',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: new Date(),
      comments: data.reason,
      newValues: {
        requestedPunchIn: data.requestedPunchIn,
        requestedPunchOut: data.requestedPunchOut,
        requestedStatus: data.requestedStatus,
        requestedShift: data.requestedShift
      }
    }]
  };

  const record = await repository.save(payload);

  if (record) {
    // Notify Approvers in background without blocking API response
    const title = 'New Attendance Correction Request';
    const message = `${currentUser.name} requested correction for ${date} (${data.correctionType}).`;
    notifyApprovers(currentUser.companyId, title, message, record).catch(err => logger.error('Error notifying approvers: ' + err.message));

    // Sync state
    emitEntitySync(currentUser.companyId, {
      module: 'attendance-corrections',
      action: 'create',
      data: record
    });
  }

  return record;
};

export const updateRequest = async (id, data, currentUser) => {
  logger.info(`Executing AttendanceCorrectionService::updateRequest for: ${id}`);
  const record = await repository.findOne(id);
  if (!record) {
    const err = new Error('Correction request not found.');
    err.statusCode = 404;
    throw err;
  }

  // Allow cancellation by owner
  if (data.status === 'Cancelled') {
    if (record.employeeId !== currentUser.id) {
      const err = new Error('You are not authorized to cancel this request.');
      err.statusCode = 403;
      throw err;
    }

    const updated = await repository.update(id, {
      status: 'Cancelled',
      $push: {
        timeline: {
          action: 'Cancelled',
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          timestamp: new Date(),
          comments: data.remarks || 'Cancelled by employee'
        }
      }
    });

    emitEntitySync(currentUser.companyId, {
      module: 'attendance-corrections',
      action: 'update',
      data: updated
    });

    return updated;
  }

  // Allow resubmission if status was 'More Information Required'
  if (record.status === 'More Information Required') {
    if (record.employeeId !== currentUser.id) {
      const err = new Error('You are not authorized to resubmit this request.');
      err.statusCode = 403;
      throw err;
    }

    // Check Window & Payroll lock again on resubmission
    const inWindow = await checkCorrectionWindow(record.date, currentUser.companyId, currentUser.role);
    if (!inWindow) {
      const err = new Error('The attendance correction window for this period has closed.');
      err.statusCode = 400;
      throw err;
    }

    const isLocked = await checkPayrollLock(record.employeeId, record.date, currentUser.companyId, currentUser.role);
    if (isLocked) {
      const err = new Error('Payroll is locked for this period. Attendance correction requires Payroll Unlock permission.');
      err.statusCode = 403;
      throw err;
    }

    const oldValues = {
      requestedPunchIn: record.requestedPunchIn,
      requestedPunchOut: record.requestedPunchOut,
      requestedStatus: record.requestedStatus,
      requestedShift: record.requestedShift
    };

    const updated = await repository.update(id, {
      requestedPunchIn: data.requestedPunchIn,
      requestedPunchOut: data.requestedPunchOut,
      requestedStatus: data.requestedStatus,
      requestedShift: data.requestedShift,
      reason: data.reason,
      remarks: data.remarks || '',
      status: 'Pending',
      $push: {
        timeline: {
          action: 'Resubmitted',
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          timestamp: new Date(),
          comments: data.reason,
          oldValues,
          newValues: {
            requestedPunchIn: data.requestedPunchIn,
            requestedPunchOut: data.requestedPunchOut,
            requestedStatus: data.requestedStatus,
            requestedShift: data.requestedShift
          }
        }
      }
    });

    const title = 'Attendance Correction Resubmitted';
    const message = `${currentUser.name} resubmitted their correction request for ${record.date}.`;
    await notifyApprovers(currentUser.companyId, title, message, updated);

    emitEntitySync(currentUser.companyId, {
      module: 'attendance-corrections',
      action: 'update',
      data: updated
    });

    return updated;
  }

  const err = new Error('Only requests requiring more information or pending requests can be modified.');
  err.statusCode = 400;
  throw err;
};

export const approveRequest = async (id, comments, currentUser) => {
  logger.info(`Executing AttendanceCorrectionService::approveRequest for: ${id} by approver: ${currentUser.id}`);

  const record = await repository.findOne(id);
  if (!record) {
    const err = new Error('Correction request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (record.status !== 'Pending' && record.status !== 'Under Review') {
    const err = new Error('Only pending or under review requests can be approved.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Verify Payroll Lock
  const isLocked = await checkPayrollLock(record.employeeId, record.date, currentUser.companyId, currentUser.role);
  if (isLocked) {
    const err = new Error('Payroll is locked for this period. Attendance correction requires Payroll Unlock permission.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Fetch System settings for late Mark/shift calculations
  const settings = await SystemSettings.findOne({ key: 'global', companyId: currentUser.companyId });
  const attendanceRules = settings?.attendanceRules || {
    dailyHours: 8,
    startTime: '09:00',
    gracePeriod: 15,
    lateTimeThreshold: '09:15'
  };

  const {
    requestedPunchIn,
    requestedPunchOut,
    requestedStatus,
    requestedShift,
    date,
    employeeId,
    employeeName,
    department,
    branch
  } = record;

  // 3. Recalculate working hours & breaks
  const reqHoursRaw = Math.max(0, parseTimeToHours(requestedPunchOut) - parseTimeToHours(requestedPunchIn));
  // Subtract default 45 mins break (0.75 hrs) if working more than 5 hours
  const breakHours = reqHoursRaw > 5 ? 0.75 : 0;
  const calculatedHours = parseFloat(Math.max(0, reqHoursRaw - breakHours).toFixed(2));

  // 4. Recalculate Late minutes
  let calculatedStatus = requestedStatus;
  let lateMinutes = 0;
  if (requestedPunchIn && requestedPunchIn !== '--:--') {
    const standardStart = attendanceRules.startTime || '09:00';
    const thresholdStr = attendanceRules.lateTimeThreshold || '09:15';
    
    const startHours = parseTimeToHours(standardStart);
    const thresholdHours = parseTimeToHours(thresholdStr);
    const actualStartHours = parseTimeToHours(requestedPunchIn);

    if (actualStartHours > thresholdHours) {
      lateMinutes = Math.round((actualStartHours - startHours) * 60);
      calculatedStatus = 'Late';
    }
  }

  // 5. Recalculate Overtime
  let calculatedOvertime = '0 hrs';
  const dailyHours = attendanceRules.dailyHours || 8;
  if (calculatedHours > dailyHours) {
    const overtimeHours = parseFloat((calculatedHours - dailyHours).toFixed(2));
    calculatedOvertime = `${overtimeHours} hrs`;
  }

  // 6. Save or Update Attendance Record
  let attRecord = null;
  const updatePayload = {
    companyId: record.companyId,
    employeeId,
    employeeName,
    department,
    branch,
    date,
    punchIn: requestedPunchIn,
    punchOut: requestedPunchOut,
    totalHours: calculatedHours,
    status: calculatedStatus,
    shift: requestedShift || 'Day Shift',
    overtime: calculatedOvertime,
    notes: `Approved correction correction details: ${record.reason}`
  };

  if (record.attendanceId && record.attendanceId !== 'NONE') {
    attRecord = await attendanceRepository.update(record.attendanceId, updatePayload);
  } else {
    // Check if record was created since request was filed
    const checkExist = await attendanceRepository.find({ employeeId, date });
    if (checkExist && checkExist[0]) {
      attRecord = await attendanceRepository.update(checkExist[0].id, updatePayload);
    } else {
      attRecord = await attendanceRepository.save(updatePayload);
    }
  }

  // 7. Update Correction Status
  const updatedRequest = await repository.update(id, {
    status: 'Approved',
    approverId: currentUser.id,
    approvedBy: currentUser.name,
    approvalDate: new Date(),
    attendanceId: attRecord.id,
    $push: {
      timeline: {
        action: 'Approved',
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        timestamp: new Date(),
        comments: comments || 'Attendance corrected successfully'
      }
    }
  });

  // 8. Log activity audit record
  try {
    const ActivityLog = mongoose.model('ActivityLog');
    const logId = `LOG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await ActivityLog.create({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      actionType: 'Attendance Correction Approved',
      fieldChanged: 'Attendance Record',
      oldValue: `Status: ${record.currentStatus}, PunchIn: ${record.currentPunchIn}, PunchOut: ${record.currentPunchOut}`,
      newValue: `Status: ${calculatedStatus}, PunchIn: ${requestedPunchIn}, PunchOut: ${requestedPunchOut}`,
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed creating audit activity log: ' + err.message);
  }

  // 9. Notify Employee
  await createNotification(record.employeeId, currentUser.companyId, {
    type: 'attendance',
    title: 'Attendance Correction Approved',
    message: `Your correction request for ${date} has been approved by ${currentUser.name}.`,
    data: { correctionId: id, status: 'Approved' },
    priority: 'high'
  });

  // 10. Sync real-time updates
  emitEntitySync(currentUser.companyId, {
    module: 'attendance-corrections',
    action: 'update',
    data: updatedRequest
  });

  emitEntitySync(currentUser.companyId, {
    module: 'attendance',
    action: 'update',
    data: attRecord
  });

  return updatedRequest;
};

export const rejectRequest = async (id, comments, currentUser) => {
  logger.info(`Executing AttendanceCorrectionService::rejectRequest for: ${id} by: ${currentUser.id}`);

  const record = await repository.findOne(id);
  if (!record) {
    const err = new Error('Correction request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (record.status !== 'Pending' && record.status !== 'Under Review') {
    const err = new Error('Only pending or under review requests can be rejected.');
    err.statusCode = 400;
    throw err;
  }

  const updated = await repository.update(id, {
    status: 'Rejected',
    $push: {
      timeline: {
        action: 'Rejected',
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        timestamp: new Date(),
        comments: comments || 'Correction request rejected'
      }
    }
  });

  // Notify Employee
  await createNotification(record.employeeId, currentUser.companyId, {
    type: 'attendance',
    title: 'Attendance Correction Rejected',
    message: `Your correction request for ${record.date} has been rejected by ${currentUser.name}. Comments: ${comments || 'None'}`,
    data: { correctionId: id, status: 'Rejected' },
    priority: 'high'
  });

  emitEntitySync(currentUser.companyId, {
    module: 'attendance-corrections',
    action: 'update',
    data: updated
  });

  return updated;
};

export const requestMoreInfo = async (id, comments, currentUser) => {
  logger.info(`Executing AttendanceCorrectionService::requestMoreInfo for: ${id} by: ${currentUser.id}`);

  const record = await repository.findOne(id);
  if (!record) {
    const err = new Error('Correction request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (record.status !== 'Pending' && record.status !== 'Under Review') {
    const err = new Error('Only pending or under review requests can be updated.');
    err.statusCode = 400;
    throw err;
  }

  const updated = await repository.update(id, {
    status: 'More Information Required',
    $push: {
      timeline: {
        action: 'More Info Requested',
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        timestamp: new Date(),
        comments: comments || 'Please provide more details/documents'
      }
    }
  });

  // Notify Employee
  await createNotification(record.employeeId, currentUser.companyId, {
    type: 'attendance',
    title: 'More Info Needed for Attendance Correction',
    message: `${currentUser.name} requested more information for correction request on ${record.date}. Comments: ${comments}`,
    data: { correctionId: id, status: 'More Information Required' },
    priority: 'high'
  });

  emitEntitySync(currentUser.companyId, {
    module: 'attendance-corrections',
    action: 'update',
    data: updated
  });

  return updated;
};

export default {
  createRequest,
  updateRequest,
  approveRequest,
  rejectRequest,
  requestMoreInfo,
  findAll: repository.find,
  findById: repository.findOne
};

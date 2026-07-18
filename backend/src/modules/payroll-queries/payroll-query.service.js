/**
 * @file src/modules/payroll-queries/payroll-query.service.js
 * @description Service business logic for Payroll Queries.
 */

import * as repository from './payroll-query.repository.js';
import PayrollQuery from './payroll-query.model.js';
import logger from '../../config/logger.js';
import mongoose from 'mongoose';
import { createNotification } from '../notifications/notifications.service.js';
import { emitEntitySync } from '../../services/sync.service.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import ActivityLog from '../activity-logs/activity-log.model.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';

// Helper to log audit/activity trail
export const logActivity = async (companyId, actor, actionType, fieldChanged, oldValue, newValue) => {
  try {
    const id = await generateCompanyUniqueId(companyId, 'activity_logs');
    const log = new ActivityLog({
      id,
      timestamp: new Date().toISOString(),
      actor,
      actionType,
      fieldChanged: fieldChanged || '—',
      oldValue: oldValue || '—',
      newValue: newValue || '—',
      companyId
    });
    await log.save();
  } catch (err) {
    logger.error('Failed to log activity: ' + err.message);
  }
};

// Helper to notify HR and Managers
const notifyHRAndManagers = async (companyId, title, message, data = {}) => {
  try {
    const conn = await getTenantConnection(companyId);
    const managers = await conn.collection('employees').find({
      roleId: { $in: ['manager', 'hr', 'admin'] },
      status: 'Active'
    }).toArray();

    for (const manager of managers) {
      if (manager.id) {
        await createNotification(manager.id, companyId, {
          type: 'payroll',
          title,
          message,
          data,
          priority: 'high'
        });
      }
    }
  } catch (err) {
    logger.error('Error notifying HR/Managers: ' + err.message);
  }
};

export const createDispute = async (payload, currentUser) => {
  logger.info(`Executing PayrollQueryService::createDispute by user: ${currentUser?.id}`);
  const companyId = currentUser.companyId;

  const Employee = mongoose.model('Employee');
  const emp = await Employee.findOne({ id: currentUser.id, companyId }).lean();
  if (!emp) {
    throw new Error('Employee record not found.');
  }

  const Payment = mongoose.model('PayrollPayment');
  const payment = await Payment.findOne({ id: payload.payrollId, companyId }).lean();
  if (!payment) {
    throw new Error('Associated payroll payment record not found.');
  }

  // Build the dispute document mapping fields
  const queryData = {
    employeeId: emp.id,
    employeeName: emp.name,
    department: emp.department || 'Administration',
    branch: emp.branch || 'Headquarters',
    designation: emp.designation || 'Staff',
    companyId,

    category: payload.category,
    subject: payload.subject,
    description: payload.description,
    priority: payload.priority || 'Medium',
    status: 'Pending',
    attachments: payload.attachments || [],
    submittedDate: new Date(),

    payrollId: payment.id,
    payrollPeriod: `${payment.month} ${payment.year}`,
    payrollMonth: payment.month,
    payrollYear: payment.year,
    grossSalary: payment.grossSalary || 0,
    netSalary: payment.netSalary || 0,
    deductions: payment.totalDeductions || 0,
    allowances: (payment.hra || 0) + (payment.travel || 0) + (payment.medical || 0) + (payment.special || 0),
    bonus: payment.bonusAmount || 0,
    lop: payment.leaveDeductions || 0,
    paidLeave: payment.paidLeaveDays || 0,
    unpaidLeave: payment.unpaidLeaveDays || 0,
    attendanceSummary: `Present Days: ${payment.attendanceDays || 0}, Paid Leaves: ${payment.paidLeaveDays || 0}, Unpaid Leaves: ${payment.unpaidLeaveDays || 0}`,
    messages: [{
      senderId: emp.id,
      senderName: emp.name,
      senderRole: currentUser.role || 'employee',
      message: payload.description,
      timestamp: new Date(),
      attachments: payload.attachments || [],
      readBy: [emp.id]
    }],
    auditTrail: [{
      action: 'Dispute Raised',
      user: emp.name,
      userId: emp.id,
      timestamp: new Date(),
      previousValue: null,
      newValue: 'Pending',
      reason: 'Employee initiated payroll dispute.'
    }]
  };

  const query = await repository.create(queryData);
  if (query) {
    // Notify HR
    await notifyHRAndManagers(
      companyId,
      'New Payroll Query Raised',
      `Employee ${emp.name} raised a ${query.priority} priority query: "${query.subject}" regarding period ${query.payrollPeriod}.`,
      { queryId: query.id }
    );

    // Sync clients
    emitEntitySync(companyId, {
      module: 'payroll-queries',
      action: 'create',
      data: query
    });

    // Write Activity Log
    await logActivity(
      companyId,
      emp.name,
      'PAYROLL_QUERY_CREATED',
      'status',
      'None',
      'Pending'
    );
  }
  return query;
};

export const getQueries = async (filters) => {
  logger.info('Executing PayrollQueryService::getQueries');
  return await repository.find(filters);
};

export const getQueryDetails = async (id) => {
  logger.info(`Executing PayrollQueryService::getQueryDetails for id: ${id}`);
  return await repository.findById(id);
};

export const postComment = async (id, sender, payload) => {
  logger.info(`Executing PayrollQueryService::postComment for id: ${id}`);
  
  const query = await repository.findById(id);
  if (!query) {
    throw new Error('Query ticket not found.');
  }

  const messageObj = {
    senderId: sender.id,
    senderName: sender.name,
    senderRole: sender.role || 'employee',
    message: payload.message,
    timestamp: new Date(),
    attachments: payload.attachments || [],
    readBy: [sender.id]
  };

  const updatedQuery = await repository.addMessage(id, messageObj);
  if (updatedQuery) {
    // Notify the other party
    const targetUserId = sender.id === query.employeeId ? 'HR' : query.employeeId;
    
    if (targetUserId === 'HR') {
      await notifyHRAndManagers(
        query.companyId,
        'Employee Response in Payroll Query',
        `Employee ${sender.name} commented on ticket: "${query.subject}".`,
        { queryId: query.id }
      );
    } else {
      await createNotification(query.employeeId, query.companyId, {
        type: 'payroll',
        title: 'New Reply on Payroll Dispute',
        message: `HR support replied to your ticket: "${query.subject}".`,
        data: { queryId: query.id },
        priority: 'normal'
      });
    }

    // Sync clients
    emitEntitySync(query.companyId, {
      module: 'payroll-queries',
      action: 'update',
      data: updatedQuery
    });

    // Write audit trail and activity log
    await repository.addAuditTrail(id, {
      action: 'Comment Posted',
      user: sender.name,
      userId: sender.id,
      timestamp: new Date(),
      previousValue: null,
      newValue: messageObj.message,
      reason: 'Posted a comment in the dispute thread.'
    });

    await logActivity(
      query.companyId,
      sender.name,
      'PAYROLL_QUERY_COMMENT',
      'messages',
      '—',
      messageObj.message
    );
  }
  return updatedQuery;
};

export const postInternalNote = async (id, authorName, note, authorId) => {
  logger.info(`Executing PayrollQueryService::postInternalNote for id: ${id}`);
  
  const query = await repository.findById(id);
  if (!query) {
    throw new Error('Query ticket not found.');
  }

  const noteObj = {
    authorName,
    note,
    timestamp: new Date()
  };

  const updatedQuery = await repository.addInternalNote(id, noteObj);
  if (updatedQuery) {
    emitEntitySync(query.companyId, {
      module: 'payroll-queries',
      action: 'update',
      data: updatedQuery
    });

    await repository.addAuditTrail(id, {
      action: 'Internal Note Added',
      user: authorName,
      userId: authorId,
      timestamp: new Date(),
      previousValue: null,
      newValue: note,
      reason: 'Logged an internal note.'
    });
  }
  return updatedQuery;
};

export const processHRAction = async (id, action, author, comments, companyId) => {
  logger.info(`Executing PayrollQueryService::processHRAction for id: ${id} -> ${action}`);

  const query = await repository.findById(id);
  if (!query) {
    throw new Error('Query ticket not found.');
  }

  const oldStatus = query.status;
  
  // Set new status and audit trail
  const updateData = { status: action };
  const updatedQuery = await repository.update(id, updateData);
  
  if (updatedQuery) {
    await repository.addAuditTrail(id, {
      action: `Status Changed to ${action}`,
      user: author.name,
      userId: author.id,
      timestamp: new Date(),
      previousValue: oldStatus,
      newValue: action,
      reason: comments || `Status updated by ${author.name}.`
    });

    await logActivity(
      companyId,
      author.name,
      'PAYROLL_QUERY_STATUS_UPDATE',
      'status',
      oldStatus,
      action
    );

    // If action is Approved, trigger recalculation automatically!
    if (action === 'Approved' || action === 'Resolved') {
      try {
        await recalculatePayrollRecord(query.payrollId, companyId);
        
        // Audit log the recalculation
        await repository.addAuditTrail(id, {
          action: 'Payroll Recalculated',
          user: 'System Engine',
          userId: 'SYSTEM',
          timestamp: new Date(),
          previousValue: null,
          newValue: 'Recalculated Success',
          reason: 'Recalculated payroll due to query approval.'
        });

        await logActivity(
          companyId,
          'System Engine',
          'PAYROLL_QUERY_AUTO_RECALCULATE',
          'payroll',
          'Previous figures',
          'Recalculated & Updated Successfully'
        );

        // Notify Employee
        await createNotification(query.employeeId, companyId, {
          type: 'payroll',
          title: 'Payroll Query Approved & Recalculated',
          message: `Your payroll query for "${query.subject}" has been approved. Your payroll has been recalculated and a revised salary slip is generated.`,
          data: { queryId: query.id },
          priority: 'high'
        });
      } catch (err) {
        logger.error('Failed auto-recalculation on dispute approval: ' + err.message);
      }
    } else {
      // General notify employee
      await createNotification(query.employeeId, companyId, {
        type: 'payroll',
        title: `Payroll Query Status: ${action}`,
        message: `Your payroll query status has been set to: ${action} by HR management.`,
        data: { queryId: query.id },
        priority: 'normal'
      });
    }

    emitEntitySync(companyId, {
      module: 'payroll-queries',
      action: 'update',
      data: updatedQuery
    });
  }

  return updatedQuery;
};

export const recalculatePayrollRecord = async (payrollId, companyId, options = {}) => {
  const { action = 'apply_current' } = options;
  logger.info(`Executing PayrollQueryService::recalculatePayrollRecord for payrollId: ${payrollId}, action: ${action}`);
  const Payment = mongoose.model('PayrollPayment');
  const Employee = mongoose.model('Employee');
  const Config = mongoose.model('PayrollConfig');
  
  const payment = await Payment.findOne({ id: payrollId, companyId });
  if (!payment) {
    throw new Error('Associated payment row not found for recalculation.');
  }

  const empId = payment.employeeId;
  const emp = await Employee.findOne({ id: empId, companyId }).lean();
  if (!emp) {
    throw new Error('Employee record not found.');
  }

  // Auto-repair missing or invalid fields from Employee record to prevent validation failures on save
  if (!payment.department && emp) {
    payment.department = emp.department || 'IT';
  }
  if (!payment.designation && emp) {
    payment.designation = emp.designation || 'Staff';
  }
  if (!payment.branch && emp) {
    payment.branch = emp.branch || 'Jaipur';
  }
  if (!payment.regime || !['Old', 'New'].includes(payment.regime)) {
    payment.regime = 'New';
  }

  // Fetch configs
  const config = await Config.findOne({ id: 'GLOBAL_CONFIG' }).lean() || {
    payrollWorkingDays: 30,
    salaryCalculationMethod: 'Fixed 30 Days',
    halfDayPolicy: 'Deduct Half Day',
    lateArrivalPenalty: 300,
    overtimeHourlyRate: 500
  };

  // Fetch monthly summary
  const { findMonthlyPayrollSummary } = await import('../attendance/attendance.service.js');
  const monthMap = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
    'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };
  const monthStr = monthMap[payment.month] || '06';
  const summaryObj = await findMonthlyPayrollSummary(companyId, `${payment.year}-${monthStr}`);
  const summary = summaryObj[empId] || {
    presentDays: 0, halfDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, holidays: 0, weekends: 0
  };

  // 1. Calculate working days
  let workingDays = Number(config.payrollWorkingDays) || 30;
  const calendarDays = new Date(parseInt(payment.year), parseInt(monthStr), 0).getDate();
  if (config.salaryCalculationMethod === 'Calendar Days') {
    workingDays = calendarDays;
  } else if (config.salaryCalculationMethod === 'Actual Working Days') {
    workingDays = calendarDays - (summary.weekends || 0) - (summary.holidays || 0);
  }

  // 2. Daily Salary Rate
  const basic = payment.basicSalary || emp.salaryAmount || 0;
  const dailySalary = Math.round(basic / Math.max(1, workingDays));

  // 3. Auto-prioritize paid leaves before unpaid:
  //    Use policy defaultDays as the cap — employee balance fields (clBalance etc.) are
  //    deducted at leave-approval time and not guaranteed to reflect this month's payroll cycle.
  const Leave = mongoose.model('Leave');
  let policies = [];
  try {
    const { getTenantConnection } = await import('../../utils/multidbConnection.js');
    const conn = await getTenantConnection(companyId);
    if (conn.asPromise) await conn.asPromise();
    policies = await conn.collection('leaves').find({ isPolicy: true }).toArray();
  } catch (e) {
    // Fall back to mongoose model if tenant connection fails
    policies = await Leave.find({ isPolicy: true, companyId }).lean();
  }

  let availablePaidLeaves = 0;
  if (policies && policies.length > 0) {
    policies.forEach(policy => {
      if (policy.leaveCode !== 'UL' && policy.leaveCode !== 'LOP' && policy.isActive !== false) {
        availablePaidLeaves += (policy.defaultDays || 0);
      }
    });
  }

  const totalLeavesTaken = (summary.paidLeaveDays || 0) + (summary.unpaidLeaveDays || 0);
  // Priority: paid leaves consumed first, remainder → unpaid/LOP
  const finalPaidLeaveDays = Math.min(totalLeavesTaken, availablePaidLeaves);
  const finalUnpaidLeaveDays = totalLeavesTaken - finalPaidLeaveDays;

  let unpaidDays = finalUnpaidLeaveDays;
  if (config.halfDayPolicy === 'Deduct Half Day') {
    unpaidDays += (summary.halfDays || 0) * 0.5;
  }

  // 4. Loss of Pay (LOP) amount
  const leaveDeduction = Math.round(dailySalary * unpaidDays);

  // 5. Deductions
  const statutoryDeductions = (payment.statutoryDeductions || 0);
  const loanEMI = (payment.loanEMI || 0);
  const advanceDeduct = (payment.advanceDeduct || 0);
  const lateDeduction = (payment.lateDeductions || 0);

  const totalDeductions = statutoryDeductions + leaveDeduction + lateDeduction + loanEMI + advanceDeduct;

  // 6. Gross & Net Salary
  const allowances = (payment.hra || 0) + (payment.travel || 0) + (payment.medical || 0) + (payment.special || 0);
  const overtimePay = (payment.overtimeAmount || 0);
  const bonus = (payment.bonusAmount || 0);

  const grossSalary = basic + allowances + overtimePay + bonus;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  const oldNetSalary = payment.netSalary;
  const difference = netSalary - oldNetSalary;

  if (action === 'preview') {
    return {
      preview: true,
      oldNetSalary,
      newNetSalary: netSalary,
      difference,
      breakdown: {
        basicSalary: basic,
        allowances,
        overtimePay,
        bonus,
        grossSalary,
        statutoryDeductions,
        leaveDeductions: leaveDeduction,
        loanEMI,
        advanceDeduct,
        lateDeductions: lateDeduction,
        totalDeductions,
        netSalary,
        paidLeaveDays: finalPaidLeaveDays,
        unpaidLeaveDays: unpaidDays
      }
    };
  }

  if (action === 'adjust_next') {
    // Clear requiresRecalculation lock on current payment
    payment.requiresRecalculation = false;
    await payment.save({ validateBeforeSave: false });

    // Compute next month & year
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    let currentMonthIdx = months.indexOf(payment.month);
    let nextMonthIdx = (currentMonthIdx + 1) % 12;
    let nextMonthName = months[nextMonthIdx];
    let nextYear = payment.year;
    if (nextMonthIdx === 0) {
      nextYear = String(parseInt(payment.year, 10) + 1);
    }

    // Create Approved PayrollBonus for next month (handles positive and negative amounts)
    const PayrollBonus = mongoose.model('PayrollBonus');
    const count = await PayrollBonus.countDocuments();
    const newBonusId = `BNS-${Date.now().toString().slice(-3)}-${count + 1}`;

    const newBonus = new PayrollBonus({
      id: newBonusId,
      employeeId: empId,
      employeeName: emp.name,
      type: 'Salary Dispute Adjustment',
      amount: difference,
      requestDate: `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-01`,
      status: 'Approved',
      companyId
    });
    await newBonus.save();

    // Update query ticket status to Resolved
    const PayrollQuery = mongoose.model('PayrollQuery');
    const ticket = await PayrollQuery.findOne({ payrollId, companyId });
    if (ticket) {
      ticket.status = 'Resolved';
      await ticket.save();
      
      await logActivity(
        companyId,
        'System Engine',
        'PAYROLL_DISPUTE_ADJUSTED_NEXT_MONTH',
        'status',
        ticket.status,
        'Resolved'
      );
    }

    // Trigger sync payload
    emitEntitySync(companyId, {
      module: 'payroll',
      action: 'update',
      data: payment
    });

    return {
      preview: false,
      adjustedNext: true,
      difference,
      nextMonth: nextMonthName,
      nextYear,
      bonus: newBonus
    };
  }

  // Update payment document
  payment.paidLeaveDays = finalPaidLeaveDays;
  payment.unpaidLeaveDays = unpaidDays;
  payment.leaveDeductions = leaveDeduction;
  payment.totalDeductions = totalDeductions;
  payment.netSalary = netSalary;
  payment.requiresRecalculation = false; // Reset lock flag

  const recalculatedRecord = await payment.save({ validateBeforeSave: false });

  // If action is apply_current, we should also resolve the matching dispute ticket!
  const PayrollQuery = mongoose.model('PayrollQuery');
  const ticket = await PayrollQuery.findOne({ payrollId, companyId });
  if (ticket) {
    ticket.status = 'Resolved';
    await ticket.save();
  }

  // Trigger sync payload
  emitEntitySync(companyId, {
    module: 'payroll',
    action: 'update',
    data: recalculatedRecord
  });

  return recalculatedRecord;
};

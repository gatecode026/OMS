/**
 * @file src/modules/kpi-scoring/kpi-scoring.service.js
 * @description Automatic KPI Scoring Engine. Resolves metrics from tasks, attendance, reports, projects, leaves, and corrections.
 */

import mongoose from 'mongoose';
import Task from '../tasks/tasks.model.js';
import Attendance from '../attendance/attendance.model.js';
import WorkReport from '../work-reports/work-reports.model.js';
import Leave from '../leaves/leaves.model.js';
import Project from '../projects/projects.model.js';
import AttendanceCorrection from '../attendance-corrections/attendance-correction.model.js';
import Employee from '../employees/employees.model.js';
import logger from '../../config/logger.js';

// Format Date object to YYYY-MM-DD string
const formatDateStr = (dateObj) => {
  return new Date(dateObj).toISOString().split('T')[0];
};

/**
 * Resolver for task_completion
 */
export const calculateTaskCompletion = async (employeeId, periodStart, periodEnd, maxScore = 10, config = {}) => {
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  // Documented rule: Include tasks assigned to this employee that are either:
  // 1. Due within this period
  // 2. OR completed (status Done/Completed) and updated within this period
  const query = {
    assigneeId: employeeId,
    $or: [
      { dueDate: { $gte: startStr, $lte: endStr } },
      {
        status: { $in: ['Completed', 'Done'] },
        updatedAt: { $gte: new Date(periodStart), $lte: new Date(periodEnd) }
      }
    ]
  };

  const employeeTasks = await Task.find(query).lean();
  const totalAssigned = employeeTasks.length;
  const completedTasks = employeeTasks.filter(t => ['Completed', 'Done'].includes(t.status)).length;

  let score = 0;
  if (totalAssigned === 0) {
    // If no tasks assigned, return neutral score based on config policy (default to maxScore)
    score = config.neutralScore !== undefined ? config.neutralScore : maxScore;
  } else {
    score = (completedTasks / totalAssigned) * maxScore;
  }

  // Clamp and round
  score = Math.max(0, Math.min(maxScore, Math.round(score * 100) / 100));

  return {
    score,
    metadata: {
      numerator: completedTasks,
      denominator: totalAssigned,
      queryPeriod: `${startStr} to ${endStr}`,
      rule: 'Tasks due in period OR completed within period.'
    }
  };
};

/**
 * Resolver for attendance
 */
export const calculateAttendanceScore = async (employeeId, periodStart, periodEnd, maxScore = 10, config = {}) => {
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  const emp = await Employee.findOne({ id: employeeId }).lean();
  if (!emp) {
    return { score: 0, metadata: { error: 'Employee not found' } };
  }

  // 1. Calculate working days in period, respecting employee joining date
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const joiningDate = emp.joiningDate ? new Date(emp.joiningDate) : null;
  const resignDate = emp.resignDate || emp.terminationDate ? new Date(emp.resignDate || emp.terminationDate) : null;

  let workingDaysCount = 0;
  let currentDate = new Date(start);

  // Load weekend policy from settings
  let weekendDays = [0]; // default: Sunday only (0 = Sunday, 6 = Saturday)
  try {
    const SettingsModel = mongoose.model('SystemSettings');
    const settings = await SettingsModel.findOne({ key: 'global' }).lean();
    const weekendPolicy = settings?.payrollRules?.weekendPolicy || 'Sunday Only';
    if (weekendPolicy === 'Saturday & Sunday') {
      weekendDays = [0, 6];
    } else if (weekendPolicy === 'Friday & Saturday') {
      weekendDays = [5, 6];
    }
  } catch (err) {
    logger.debug('Error reading weekend policy: ' + err.message);
  }

  // Load holidays in period
  let holidayDates = new Set();
  try {
    const HolidayModel = mongoose.model('Holiday');
    const holidays = await HolidayModel.find({
      date: { $gte: startStr, $lte: endStr }
    }).lean();
    holidays.forEach(h => holidayDates.add(h.date));
  } catch (err) {
    logger.debug('Error reading holidays: ' + err.message);
  }

  while (currentDate <= end) {
    const curStr = formatDateStr(currentDate);
    const dayOfWeek = currentDate.getDay();

    // Check if employee has joined yet and has not resigned yet
    const hasJoined = !joiningDate || currentDate >= joiningDate;
    const hasNotResigned = !resignDate || currentDate <= resignDate;

    if (hasJoined && hasNotResigned) {
      const isWeekend = weekendDays.includes(dayOfWeek);
      const isHoliday = holidayDates.has(curStr);

      if (!isWeekend && !isHoliday) {
        workingDaysCount++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 2. Fetch attendance records in period
  const attendanceRecords = await Attendance.find({
    employeeId,
    date: { $gte: startStr, $lte: endStr }
  }).lean();

  // Present matches Present, WFH, WFH/Late, Late, WFH/Late, etc.
  const presentDays = attendanceRecords.filter(r =>
    ['Present', 'Late', 'Work From Home', 'WFH', 'Punched In', 'Overtime'].includes(r.status)
  ).length;

  let score = 0;
  if (workingDaysCount === 0) {
    score = maxScore;
  } else {
    score = (presentDays / workingDaysCount) * maxScore;
  }

  score = Math.max(0, Math.min(maxScore, Math.round(score * 100) / 100));

  return {
    score,
    metadata: {
      numerator: presentDays,
      denominator: workingDaysCount,
      queryPeriod: `${startStr} to ${endStr}`,
      rule: 'Present/WFH/Late days divided by eligible working days.'
    }
  };
};

/**
 * Resolver for daily_reports
 */
export const calculateDailyReportScore = async (employeeId, periodStart, periodEnd, maxScore = 10, config = {}) => {
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  // Get eligible working days (reuse logic helper or compute directly)
  const attendanceRes = await calculateAttendanceScore(employeeId, periodStart, periodEnd, maxScore, config);
  const workingDays = attendanceRes.metadata.denominator || 22; // default fallback

  const reports = await WorkReport.find({
    employeeId,
    date: { $gte: startStr, $lte: endStr }
  }).lean();

  // Deduplicate by date (just in case they submitted multiple per day)
  const uniqueDates = new Set(reports.map(r => r.date));
  const uniqueReportsCount = uniqueDates.size;

  let score = 0;
  if (workingDays === 0) {
    score = maxScore;
  } else {
    score = (uniqueReportsCount / workingDays) * maxScore;
  }

  score = Math.max(0, Math.min(maxScore, Math.round(score * 100) / 100));

  return {
    score,
    metadata: {
      numerator: uniqueReportsCount,
      denominator: workingDays,
      queryPeriod: `${startStr} to ${endStr}`,
      rule: 'Unique work reports submitted divided by eligible working days.'
    }
  };
};

/**
 * Resolver for project_completion
 */
export const calculateProjectCompletionScore = async (employeeId, periodStart, periodEnd, maxScore = 10, config = {}) => {
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  // We find projects matching scope: default is employee-connected
  // Connect via members or leader or manager
  const emp = await Employee.findOne({ id: employeeId }).lean();
  const empName = emp ? emp.name : '';

  const scope = config.scope || 'employee'; // employee, team, department
  let query = {};
  if (scope === 'employee') {
    query = {
      $or: [
        { members: employeeId },
        { members: empName },
        { leader: employeeId },
        { leader: empName },
        { manager: employeeId },
        { manager: empName }
      ]
    };
  } else if (scope === 'department' && emp?.department) {
    query = { department: emp.department };
  } else if (scope === 'team' && emp?.team) {
    query = { team: emp.team };
  } else {
    // Fallback if no matching params
    query = { members: employeeId };
  }

  const projects = await Project.find(query).lean();
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;

  let score = 0;
  if (totalProjects === 0) {
    score = config.neutralScore !== undefined ? config.neutralScore : maxScore;
  } else {
    score = (completedProjects / totalProjects) * maxScore;
  }

  // Deduct penalty for delayed projects if configured
  if (config.includeDelayedProjects && config.delayedPenalty) {
    const delayedCount = projects.filter(p => p.status === 'Delayed').length;
    score = Math.max(0, score - (delayedCount * config.delayedPenalty));
  }

  score = Math.max(0, Math.min(maxScore, Math.round(score * 100) / 100));

  return {
    score,
    metadata: {
      numerator: completedProjects,
      denominator: totalProjects,
      queryPeriod: `${startStr} to ${endStr}`,
      scope,
      rule: 'Completed projects divided by total projects in scope.'
    }
  };
};

/**
 * Resolver for overdue_tasks
 */
export const calculateOverdueTaskScore = async (employeeId, periodStart, periodEnd, maxScore = 10, config = {}) => {
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  // Find all tasks assigned to the employee
  const tasks = await Task.find({ assigneeId: employeeId }).lean();
  const totalTasks = tasks.length;

  // Filter tasks that are overdue
  // A task is overdue if not completed/done, and dueDate is past the end of the period (or current date if in past)
  const todayStr = formatDateStr(new Date());
  const referenceDate = endStr < todayStr ? endStr : todayStr;

  const overdueTasks = tasks.filter(t => {
    const isCompleted = ['Completed', 'Done'].includes(t.status);
    return !isCompleted && t.dueDate && t.dueDate < referenceDate;
  });

  const overdueCount = overdueTasks.length;

  let score = maxScore;
  if (totalTasks > 0) {
    // Normalised formula: (1 - (overdue tasks / total tasks)) * maxScore
    score = (1 - (overdueCount / totalTasks)) * maxScore;
  }

  // Allow custom penalty-based overrides if configured
  if (config.penaltyPerTask) {
    score = Math.max(0, maxScore - (overdueCount * config.penaltyPerTask));
  }

  score = Math.max(0, Math.min(maxScore, Math.round(score * 100) / 100));

  return {
    score,
    metadata: {
      numerator: overdueCount,
      denominator: totalTasks,
      queryPeriod: `${startStr} to ${endStr}`,
      rule: 'Formula: (1 - (overdue / total assigned)) * maxScore'
    }
  };
};

/**
 * Resolver for leave_percentage
 */
export const calculateLeaveScore = async (employeeId, periodStart, periodEnd, maxScore = 10, config = {}) => {
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  const attendanceRes = await calculateAttendanceScore(employeeId, periodStart, periodEnd, maxScore, config);
  const workingDays = attendanceRes.metadata.denominator || 22;

  // Find approved leaves that overlap with the period
  const leaves = await Leave.find({
    employeeId,
    status: 'Approved',
    isPolicy: { $ne: true },
    fromDate: { $lte: endStr },
    toDate: { $gte: startStr }
  }).lean();

  // Sum unpaid leave days within the period
  let unpaidDaysInPeriod = 0;

  leaves.forEach(leave => {
    // Determine overlapping range
    const overlapStart = leave.fromDate > startStr ? leave.fromDate : startStr;
    const overlapEnd = leave.toDate < endStr ? leave.toDate : endStr;

    // Calculate days between overlap dates
    const sDate = new Date(overlapStart);
    const eDate = new Date(overlapEnd);
    const diffTime = Math.abs(eDate - sDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // For unpaid leaves, count the overlap days. For mixed leaves, look at unpaidDays property proportionately
    if (leave.leaveClass === 'Unpaid') {
      unpaidDaysInPeriod += diffDays;
    } else if (leave.leaveClass === 'Mixed' && leave.unpaidDays > 0) {
      const prop = leave.unpaidDays / leave.days;
      unpaidDaysInPeriod += (diffDays * prop);
    }
  });

  // Default: (1 - (unpaid leave days / working days)) * maxScore
  let score = maxScore;
  if (workingDays > 0) {
    score = (1 - (unpaidDaysInPeriod / workingDays)) * maxScore;
  }

  score = Math.max(0, Math.min(maxScore, Math.round(score * 100) / 100));

  return {
    score,
    metadata: {
      numerator: Math.round(unpaidDaysInPeriod * 100) / 100,
      denominator: workingDays,
      queryPeriod: `${startStr} to ${endStr}`,
      rule: 'Deduct only for Unpaid / Unauthorized absence days.'
    }
  };
};

/**
 * Resolver for attendance_corrections
 */
export const calculateAttendanceCorrectionScore = async (employeeId, periodStart, periodEnd, maxScore = 10, config = {}) => {
  const startStr = formatDateStr(periodStart);
  const endStr = formatDateStr(periodEnd);

  // Count approved attendance correction requests in period
  const corrections = await AttendanceCorrection.find({
    employeeId,
    status: 'Approved',
    date: { $gte: startStr, $lte: endStr }
  }).lean();

  const count = corrections.length;

  // Defaults: warning threshold of 2 corrections, then deduct 1 point per correction above that
  const threshold = config.warningThreshold !== undefined ? config.warningThreshold : 2;
  const penalty = config.penaltyPerCorrection !== undefined ? config.penaltyPerCorrection : 1.0;

  let score = maxScore;
  if (count > threshold) {
    score = maxScore - ((count - threshold) * penalty);
  }

  score = Math.max(0, Math.min(maxScore, Math.round(score * 100) / 100));

  return {
    score,
    metadata: {
      numerator: count,
      denominator: threshold,
      queryPeriod: `${startStr} to ${endStr}`,
      rule: `Warning threshold: ${threshold}. Penalty per correction: ${penalty}`
    }
  };
};

// Mapper of keys to resolver functions
const scoreResolvers = {
  task_completion: calculateTaskCompletion,
  attendance: calculateAttendanceScore,
  daily_reports: calculateDailyReportScore,
  project_completion: calculateProjectCompletionScore,
  overdue_tasks: calculateOverdueTaskScore,
  leave_percentage: calculateLeaveScore,
  attendance_corrections: calculateAttendanceCorrectionScore
};

/**
 * Main function to calculate a single KPI score based on data source
 */
export const calculateAutoScore = async (dataSourceKey, employeeId, periodStart, periodEnd, maxScore, config = {}) => {
  const resolver = scoreResolvers[dataSourceKey];
  if (!resolver) {
    logger.warn(`No score resolver found for data source: ${dataSourceKey}`);
    return { score: maxScore, metadata: { warning: 'Unknown data source, default to maxScore' } };
  }
  try {
    return await resolver(employeeId, periodStart, periodEnd, maxScore, config);
  } catch (err) {
    logger.error(`Error resolving score for ${dataSourceKey}: ${err.message}`);
    return { score: 0, metadata: { error: err.message } };
  }
};

export default {
  calculateAutoScore,
  calculateTaskCompletion,
  calculateAttendanceScore,
  calculateDailyReportScore,
  calculateProjectCompletionScore,
  calculateOverdueTaskScore,
  calculateLeaveScore,
  calculateAttendanceCorrectionScore
};

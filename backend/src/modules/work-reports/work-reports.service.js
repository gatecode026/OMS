/**
 * @file src/modules/work-reports/work-reports.service.js
 * @description Service business logic for WorkReports module.
 */

import repository from './work-reports.repository.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';
import Project from '../projects/projects.model.js';
import Task from '../tasks/tasks.model.js';
import { isCurrentWeekDate, EMPLOYEE_EDITABLE_STATUSES, LOCKED_STATUSES } from './work-reports.validation.js';

export const findAll = async (query) => {
  logger.info('Executing WorkReportsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing WorkReportsService::findById query: ' + id);
  return repository.findOne(id);
};

/**
 * Find existing report for an employee on a given date (duplicate check endpoint).
 */
export const findByEmployeeAndDate = async (employeeId, date) => {
  logger.info(`Executing WorkReportsService::findByEmployeeAndDate: emp=${employeeId}, date=${date}`);
  return repository.findByEmployeeAndDate(employeeId, date);
};

/**
 * Transition task statuses when report is submitted (tasks → 'In Review')
 */
const transitionTasksToInReview = async (completedTaskIds, currentUser) => {
  if (!completedTaskIds || completedTaskIds.length === 0) return;
  try {
    logger.info(`[ReportSubmission] Transitioning tasks to 'In Review': ${JSON.stringify(completedTaskIds)}`);
    
    // 1. Update standalone Task collection in bulk
    await Task.updateMany(
      { id: { $in: completedTaskIds } },
      { $set: { status: 'In Review', progress: 80 } }
    );

    // 2. Find and update embedded tasks inside Project collection grouped by project
    const projects = await Project.find({ 'tasks.id': { $in: completedTaskIds } });
    for (const project of projects) {
      let modified = false;
      project.tasks.forEach(t => {
        if (completedTaskIds.includes(t.id)) {
          t.status = 'In Review';
          t.progress = 80;
          t.activityLog = t.activityLog || [];
          t.activityLog.push({
            id: `act-${Math.random().toString(36).substring(2, 9)}`,
            action: 'sent_to_review',
            details: `Task sent to review automatically via daily work report submission by ${currentUser?.name || 'Employee'}`,
            timestamp: new Date().toISOString(),
            userName: currentUser?.name || 'System'
          });
          modified = true;
        }
      });
      if (modified) {
        project.markModified('tasks');
        await project.save();
      }
    }
    logger.info(`[ReportSubmission] Auto-transitioned tasks completed successfully`);
  } catch (err) {
    logger.error('Error transitioning tasks to In Review:', err);
  }
};

/**
 * Transition tasks to Completed when report is approved
 */
const transitionTasksToCompleted = async (completedTaskIds, currentUser) => {
  if (!completedTaskIds || completedTaskIds.length === 0) return;
  try {
    logger.info(`[ReportApproval] Auto-completing tasks: ${JSON.stringify(completedTaskIds)}`);
    for (const taskId of completedTaskIds) {
      await Task.updateOne(
        { id: taskId },
        { $set: { status: 'Completed', progress: 100 } }
      );

      const project = await Project.findOne({ 'tasks.id': taskId });
      if (project) {
        project.tasks = project.tasks.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              status: 'Completed',
              completed: true,
              progress: 100,
              activityLog: [
                ...(t.activityLog || []),
                {
                  id: `act-${Math.random().toString(36).substring(2, 9)}`,
                  action: 'approved',
                  details: `Task approved and completed automatically via work report approval by ${currentUser?.name || 'Manager'}`,
                  timestamp: new Date().toISOString(),
                  userName: currentUser?.name || 'System'
                }
              ]
            };
          }
          return t;
        });
        project.markModified('tasks');
        await project.save();
        logger.info(`[ReportApproval] Successfully auto-completed task ${taskId} in project ${project.name}`);
      }
    }
  } catch (err) {
    logger.error('Error auto-completing tasks on report approval:', err);
  }
};

/**
 * Revert tasks to In Progress when report is rejected
 */
const revertTasksToInProgress = async (completedTaskIds, status, currentUser) => {
  if (!completedTaskIds || completedTaskIds.length === 0) return;
  try {
    logger.info(`[ReportRejection] Report status=${status}, reverting tasks to 'In Progress': ${JSON.stringify(completedTaskIds)}`);
    for (const taskId of completedTaskIds) {
      await Task.updateOne(
        { id: taskId },
        { $set: { status: 'In Progress', progress: 50 } }
      );

      const project = await Project.findOne({ 'tasks.id': taskId });
      if (project) {
        project.tasks = project.tasks.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              status: 'In Progress',
              completed: false,
              progress: 50,
              activityLog: [
                ...(t.activityLog || []),
                {
                  id: `act-${Math.random().toString(36).substring(2, 9)}`,
                  action: 'reopened',
                  details: `Task reopened automatically due to work report ${status.toLowerCase()} by ${currentUser?.name || 'Manager'}`,
                  timestamp: new Date().toISOString(),
                  userName: currentUser?.name || 'System'
                }
              ]
            };
          }
          return t;
        });
        project.markModified('tasks');
        await project.save();
      }
    }
  } catch (err) {
    logger.error('Error reverting tasks to In Progress on report rejection:', err);
  }
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing WorkReportsService::createRecord by user: ' + currentUser?.id);

  // 1. Validate date is within current week
  if (data.date && !isCurrentWeekDate(data.date)) {
    const error = new Error(`Report date "${data.date}" is outside the allowed current working week.`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Check for existing report on the same date for this employee
  const existing = await repository.findByEmployeeAndDate(data.employeeId, data.date);
  if (existing) {
    // If existing report is in an editable state, return it with a special flag
    if (EMPLOYEE_EDITABLE_STATUSES.includes(existing.status)) {
      const error = new Error('A report already exists for this date. You can edit the existing report.');
      error.statusCode = 409;
      error.existingReport = existing;
      throw error;
    }
    // If locked (Submitted, Approved, etc.), block completely
    const error = new Error('You have already submitted a report for this date. Please edit the existing report if allowed.');
    error.statusCode = 409;
    error.existingReport = existing;
    throw error;
  }

  // 2b. Check for duplicate task submissions (one report per task per employee rule)
  if (data.completedTaskIds && data.completedTaskIds.length > 0) {
    const userReports = await repository.find({ employeeId: data.employeeId });
    const submittedTaskIds = new Set();
    userReports.forEach(r => {
      if (r.status !== 'Draft' && r.completedTaskIds) {
        r.completedTaskIds.forEach(id => submittedTaskIds.add(id));
      }
    });
    for (const taskId of data.completedTaskIds) {
      if (submittedTaskIds.has(taskId)) {
        const error = new Error(`Task "${taskId}" has already been submitted in another report.`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // 3. Initialize version tracking
  data.version = 1;
  data.editHistory = [];
  if (!data.submittedTime && data.status !== 'Draft') {
    data.submittedTime = new Date().toISOString();
  }

  const record = await repository.save(data);

  // 4. If status is 'Submitted' (not Draft), transition tasks in background
  if (record && record.status === 'Submitted' && record.completedTaskIds && record.completedTaskIds.length > 0) {
    (async () => transitionTasksToInReview(record.completedTaskIds, currentUser))();
  }

  // 5. Emit real-time sync
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'workReports',
      action: 'create',
      data: record
    });
  }

  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing WorkReportsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);

  const existing = await repository.findOne(id);
  if (!existing) {
    const error = new Error(`Report ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Determine if this is an employee edit vs a manager status change
  const isStatusChange = data.status && data.status !== existing.status;
  const isEmployeeEdit = currentUser?.id === existing.employeeId;

  // Employee editing rules
  if (isEmployeeEdit && !isStatusChange) {
    // Employees can only edit Draft, Rejected, Needs Revision, Changes Requested
    if (!EMPLOYEE_EDITABLE_STATUSES.includes(existing.status)) {
      const error = new Error(`Cannot edit a report with status "${existing.status}". Only Draft, Rejected, Needs Revision, or Changes Requested reports can be edited.`);
      error.statusCode = 403;
      throw error;
    }
    // If employee is editing date, validate it's within current week
    if (data.date && !isCurrentWeekDate(data.date)) {
      const error = new Error(`Report date "${data.date}" is outside the allowed current working week.`);
      error.statusCode = 400;
      throw error;
    }
    // Verify that the task selection is not being changed
    if (data.completedTaskIds) {
      const existingSorted = [...(existing.completedTaskIds || [])].sort().join(',');
      const incomingSorted = [...data.completedTaskIds].sort().join(',');
      if (existingSorted !== incomingSorted) {
        const error = new Error('Task associations cannot be changed after initial submission.');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // Manager/Admin status change rules
  if (isStatusChange) {
    if (data.status === 'Approved') {
      data.reviewedBy = currentUser?.name || 'Manager';
      data.approvalDate = new Date().toISOString();
    }
    if (data.status === 'Rejected' || data.status === 'Needs Revision') {
      data.rejectionReason = data.rejectionReason || data.feedback || '';
    }
  }

  // Track edit history (only for content edits, not just status changes)
  const contentFields = ['summary', 'majorAccomplishments', 'challengesFaced', 'supportRequired', 'ongoingTasks', 'pendingTasks', 'plannedTasksTomorrow', 'completedTaskIds', 'tasksCompleted'];
  const changedFields = contentFields.filter(f => data[f] !== undefined && JSON.stringify(data[f]) !== JSON.stringify(existing[f]));

  if (changedFields.length > 0) {
    const previousValues = {};
    changedFields.forEach(f => { previousValues[f] = existing[f]; });

    data.editHistory = [
      ...(existing.editHistory || []),
      {
        editedBy: currentUser?.name || 'User',
        editedAt: new Date().toISOString(),
        changedFields,
        previousValues
      }
    ];
    data.version = (existing.version || 1) + 1;
    data.lastEditedAt = new Date().toISOString();
  }

  // If Draft is being submitted, set submittedTime
  if (data.status === 'Submitted' && existing.status === 'Draft') {
    data.submittedTime = new Date().toISOString();
  }

  // Auto-save for draft
  if (data.status === 'Draft') {
    data.draftAutoSavedAt = new Date().toISOString();
  }

  const record = await repository.update(id, data);

  // Task status transitions based on report status changes
  if (record && isStatusChange) {
    if (data.status === 'Approved' && record.completedTaskIds && record.completedTaskIds.length > 0) {
      (async () => transitionTasksToCompleted(record.completedTaskIds, currentUser))();
    }
    if ((data.status === 'Rejected' || data.status === 'Changes Requested' || data.status === 'Needs Revision') && record.completedTaskIds && record.completedTaskIds.length > 0) {
      (async () => revertTasksToInProgress(record.completedTaskIds, data.status, currentUser))();
    }
    // If re-submitted after revision, transition tasks to In Review again
    if (data.status === 'Submitted' && record.completedTaskIds && record.completedTaskIds.length > 0) {
      (async () => transitionTasksToInReview(record.completedTaskIds, currentUser))();
    }
  }

  // Emit real-time sync
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'workReports',
      action: 'update',
      data: record
    });
  }

  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing WorkReportsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);

  const existing = await repository.findOne(id);
  if (existing && existing.status === 'Approved') {
    const error = new Error('Cannot delete an approved report.');
    error.statusCode = 403;
    throw error;
  }

  const record = await repository.remove(id);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'workReports',
      action: 'delete',
      data: id
    });
  }
  return record;
};

export default {
  findAll,
  findById,
  findByEmployeeAndDate,
  createRecord,
  updateRecord,
  deleteRecord
};

/**
 * @file src/modules/work-reports/work-reports.service.js
 * @description Service business logic for WorkReports module.
 */

import repository from './work-reports.repository.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';
import Project from '../projects/projects.model.js';
import Task from '../tasks/tasks.model.js';

export const findAll = async (query) => {
  logger.info('Executing WorkReportsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing WorkReportsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing WorkReportsService::createRecord by user: ' + currentUser?.id);
  const record = await repository.save(data);

  // If daily report is created with completedTaskIds, transition those tasks to 'In Review'
  if (record && record.completedTaskIds && record.completedTaskIds.length > 0) {
    try {
      logger.info(`[ReportSubmission] Report ${record.id} created, transitioning tasks to 'In Review': ${JSON.stringify(record.completedTaskIds)}`);
      for (const taskId of record.completedTaskIds) {
        // 1. Update standalone Task collection
        await Task.updateOne(
          { id: taskId },
          { $set: { status: 'In Review', progress: 80 } }
        );

        // 2. Find and update embedded tasks inside Project collection
        const project = await Project.findOne({ 'tasks.id': taskId });
        if (project) {
          project.tasks = project.tasks.map(t => {
            if (t.id === taskId) {
              return {
                ...t,
                status: 'In Review',
                progress: 80,
                activityLog: [
                  ...(t.activityLog || []),
                  {
                    id: `act-${Math.random().toString(36).substring(2, 9)}`,
                    action: 'sent_to_review',
                    details: `Task sent to review automatically via daily work report submission by ${currentUser?.name || 'Employee'}`,
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
          logger.info(`[ReportSubmission] Auto-transitioned task ${taskId} to In Review`);
        }
      }
    } catch (err) {
      logger.error('Error transitioning tasks to In Review on report creation:', err);
    }
  }

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
  const record = await repository.update(id, data);

  // If daily report is approved, complete all tasks associated with it
  if (record && data.status === 'Approved' && record.completedTaskIds && record.completedTaskIds.length > 0) {
    try {
      logger.info(`[ReportApproval] Report ${id} approved, auto-completing tasks: ${JSON.stringify(record.completedTaskIds)}`);
      for (const taskId of record.completedTaskIds) {
        // 1. Update standalone Task collection
        await Task.updateOne(
          { id: taskId },
          { $set: { status: 'Completed', progress: 100 } }
        );

        // 2. Find and update embedded tasks inside Project collection
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
  }

  // If daily report is rejected or changes requested, transition those tasks back to 'In Progress'
  if (record && (data.status === 'Rejected' || data.status === 'Changes Requested') && record.completedTaskIds && record.completedTaskIds.length > 0) {
    try {
      logger.info(`[ReportRejection] Report ${id} status updated to ${data.status}, reverting tasks to 'In Progress': ${JSON.stringify(record.completedTaskIds)}`);
      for (const taskId of record.completedTaskIds) {
        // 1. Update standalone Task collection
        await Task.updateOne(
          { id: taskId },
          { $set: { status: 'In Progress', progress: 50 } }
        );

        // 2. Find and update embedded tasks inside Project collection
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
                    details: `Task reopened automatically due to work report ${data.status.toLowerCase()} by ${currentUser?.name || 'Manager'}`,
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
          logger.info(`[ReportRejection] Successfully reverted task ${taskId} to In Progress`);
        }
      }
    } catch (err) {
      logger.error('Error reverting tasks to In Progress on report rejection:', err);
    }
  }

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
  createRecord,
  updateRecord,
  deleteRecord
};

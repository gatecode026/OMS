/**
 * @file src/modules/employees/exit.service.js
 * @description Enterprise Employee Exit & Inactive Employee workflow helper service.
 */

import Employee from './employees.model.js';
import Task from '../tasks/tasks.model.js';
import Project from '../projects/projects.model.js';
import Event from '../events/event.model.js';
import ActivityLog from '../activity-logs/activity-log.model.js';
import { createNotification } from '../notifications/notifications.service.js';
import { getIO } from '../../config/socket.js';
import { emitEntitySync } from '../../services/sync.service.js';
import logger from '../../config/logger.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';

/**
 * Fetch all outstanding tasks, projects, and future events for an employee.
 * @param {string} employeeId - Business ID of the employee
 */
export const getOpenWork = async (employeeId) => {
  const empDoc = await Employee.findOne({ id: employeeId }).lean();
  if (!empDoc) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const empName = empDoc.name;

  // 1. Pending Tasks (not Completed or Done)
  const pendingTasks = await Task.find({
    assigneeId: employeeId,
    status: { $nin: ['Completed', 'Done'] }
  }).lean();

  // 2. Active Projects (as Manager, Leader, or Member)
  const activeProjects = await Project.find({
    $or: [
      { manager: { $regex: new RegExp(`^${empName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { leader: { $regex: new RegExp(`^${empName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { members: { $regex: new RegExp(`^${empName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    ],
    status: { $in: ['Planning', 'In Progress', 'Active', 'Pending'] }
  }).lean();

  // 3. Future Events (where attendee lists matching their ObjectId)
  const todayStr = new Date().toISOString().split('T')[0];
  const futureEvents = await Event.find({
    attendees: empDoc._id,
    date: { $gte: todayStr }
  }).lean();

  return {
    pendingTasks,
    activeProjects,
    futureEvents
  };
};

/**
 * Deactivates an employee and handles reassignment of all outstanding work.
 * @param {string} employeeId - Business ID of target employee
 * @param {object} exitData - Details of exit
 * @param {object} currentUser - Performing admin user payload
 */
export const deactivate = async (employeeId, exitData, currentUser) => {
  const empDoc = await Employee.findOne({ id: employeeId });
  if (!empDoc) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const empName = empDoc.name;
  const companyId = currentUser?.companyId || empDoc.companyId || 'COMP-DEFAULT';

  const {
    lastWorkingDay,
    exitDate,
    exitReason,
    exitNotes,
    taskReassignments,
    projectReassignments
  } = exitData;

  // 1. Reassign Pending Tasks
  if (taskReassignments) {
    if (taskReassignments.allTo) {
      const targetEmp = await Employee.findOne({ id: taskReassignments.allTo });
      if (targetEmp) {
        const tasksToReassign = await Task.find({ assigneeId: employeeId, status: { $nin: ['Completed', 'Done'] } });
        for (const task of tasksToReassign) {
          const oldVal = `${task.assigneeName} (${task.assigneeId})`;
          task.assigneeId = targetEmp.id;
          task.assigneeName = targetEmp.name;
          await task.save();

          await ActivityLog.create({
            id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toISOString(),
            actor: currentUser?.name || 'System',
            actionType: 'Task Reassigned',
            fieldChanged: 'assigneeId',
            oldValue: oldVal,
            newValue: `${targetEmp.name} (${targetEmp.id})`,
            ip: '127.0.0.1',
            companyId
          });
        }
      }
    } else {
      for (const [taskId, newAssigneeId] of Object.entries(taskReassignments)) {
        const task = await Task.findOne({ id: taskId });
        const targetEmp = await Employee.findOne({ id: newAssigneeId });
        if (task && targetEmp) {
          const oldVal = `${task.assigneeName} (${task.assigneeId})`;
          task.assigneeId = targetEmp.id;
          task.assigneeName = targetEmp.name;
          await task.save();

          await ActivityLog.create({
            id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toISOString(),
            actor: currentUser?.name || 'System',
            actionType: 'Task Reassigned',
            fieldChanged: 'assigneeId',
            oldValue: oldVal,
            newValue: `${targetEmp.name} (${targetEmp.id})`,
            ip: '127.0.0.1',
            companyId
          });
        }
      }
    }
  }

  // 2. Reassign Projects (Manager & Leader)
  if (projectReassignments) {
    if (projectReassignments.allTo) {
      const targetEmp = await Employee.findOne({ id: projectReassignments.allTo });
      if (targetEmp) {
        const projectsToReassign = await Project.find({
          $or: [
            { manager: { $regex: new RegExp(`^${empName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { leader: { $regex: new RegExp(`^${empName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
          ]
        });
        for (const proj of projectsToReassign) {
          if (proj.manager && proj.manager.toLowerCase() === empName.toLowerCase()) {
            const oldVal = proj.manager;
            proj.manager = targetEmp.name;
            await proj.save();
            await ActivityLog.create({
              id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              timestamp: new Date().toISOString(),
              actor: currentUser?.name || 'System',
              actionType: 'Project Manager Reassigned',
              fieldChanged: 'manager',
              oldValue: oldVal,
              newValue: targetEmp.name,
              ip: '127.0.0.1',
              companyId
            });
          }
          if (proj.leader && proj.leader.toLowerCase() === empName.toLowerCase()) {
            const oldVal = proj.leader;
            proj.leader = targetEmp.name;
            await proj.save();
            await ActivityLog.create({
              id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              timestamp: new Date().toISOString(),
              actor: currentUser?.name || 'System',
              actionType: 'Project Leader Reassigned',
              fieldChanged: 'leader',
              oldValue: oldVal,
              newValue: targetEmp.name,
              ip: '127.0.0.1',
              companyId
            });
          }
        }
      }
    } else {
      for (const [projId, newAssigneeId] of Object.entries(projectReassignments)) {
        const proj = await Project.findOne({ id: projId });
        const targetEmp = await Employee.findOne({ id: newAssigneeId });
        if (proj && targetEmp) {
          if (proj.manager && proj.manager.toLowerCase() === empName.toLowerCase()) {
            const oldVal = proj.manager;
            proj.manager = targetEmp.name;
            await proj.save();
            await ActivityLog.create({
              id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              timestamp: new Date().toISOString(),
              actor: currentUser?.name || 'System',
              actionType: 'Project Manager Reassigned',
              fieldChanged: 'manager',
              oldValue: oldVal,
              newValue: targetEmp.name,
              ip: '127.0.0.1',
              companyId
            });
          }
          if (proj.leader && proj.leader.toLowerCase() === empName.toLowerCase()) {
            const oldVal = proj.leader;
            proj.leader = targetEmp.name;
            await proj.save();
            await ActivityLog.create({
              id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              timestamp: new Date().toISOString(),
              actor: currentUser?.name || 'System',
              actionType: 'Project Leader Reassigned',
              fieldChanged: 'leader',
              oldValue: oldVal,
              newValue: targetEmp.name,
              ip: '127.0.0.1',
              companyId
            });
          }
        }
      }
    }
  }

  // 3. Remove inactive employee automatically from active Project Members lists
  await Project.updateMany(
    { members: { $regex: new RegExp(`^${empName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    { $pull: { members: empName } }
  );

  // 4. Remove employee from future Meetings / Events
  const todayStr = new Date().toISOString().split('T')[0];
  await Event.updateMany(
    { date: { $gte: todayStr }, attendees: empDoc._id },
    { $pull: { attendees: empDoc._id } }
  );

  // 5. Update Employee status
  empDoc.accountStatus = 'Inactive';
  empDoc.status = 'Inactive';
  empDoc.employmentStatus = exitReason || 'Resigned';
  empDoc.exitInfo = {
    lastWorkingDay,
    exitDate,
    exitReason: exitReason || 'Resignation',
    exitNotes,
    deactivatedAt: new Date(),
    deactivatedBy: currentUser?.id || 'System'
  };

  await empDoc.save();

  // 6. Push real-time Sync event
  emitEntitySync(companyId, {
    module: 'employees',
    action: 'deactivate',
    data: empDoc.id
  });

  // 7. Force disconnect active socket connections matching `user:${employeeId}`
  try {
    const io = getIO();
    io.in(`user:${employeeId}`).disconnectSockets(true);
    logger.info(`[Socket Engine] Forcefully disconnected all sockets for user:${employeeId}`);
  } catch (err) {
    logger.debug(`[Socket Engine] Could not forcefully disconnect user:${employeeId} - ${err.message}`);
  }

  // 8. Log employee deactivation audit log
  await ActivityLog.create({
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    actor: currentUser?.name || 'System',
    actionType: 'Employee Deactivated',
    fieldChanged: 'accountStatus',
    oldValue: 'Active',
    newValue: 'Inactive',
    ip: '127.0.0.1',
    companyId
  });

  // 9. Send system notifications to managers, admins, HR
  try {
    const conn = await getTenantConnection(companyId);
    const recipients = await conn.collection('employees').find({
      roleId: { $in: ['manager', 'hr', 'admin'] },
      accountStatus: 'Active'
    }).toArray();

    for (const rec of recipients) {
      if (rec.id && rec.id !== employeeId) {
        await createNotification(rec.id, companyId, {
          type: 'system',
          title: 'Employee Exited',
          message: `${empName} has been deactivated and pending work reassigned.`,
          data: { employeeId }
        });
      }
    }
  } catch (err) {
    logger.error('Failed to notify managers/HR of deactivation: ' + err.message);
  }

  return empDoc;
};

/**
 * Restores a deactivated employee to Active status.
 * @param {string} employeeId - Business ID of the employee
 * @param {object} currentUser - Admin user payload performing the restore
 */
export const restore = async (employeeId, currentUser) => {
  const empDoc = await Employee.findOne({ id: employeeId });
  if (!empDoc) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const companyId = currentUser?.companyId || empDoc.companyId || 'COMP-DEFAULT';

  empDoc.accountStatus = 'Active';
  empDoc.status = 'Active';
  empDoc.employmentStatus = 'Active';
  
  if (empDoc.exitInfo) {
    empDoc.exitInfo.restoredAt = new Date();
    empDoc.exitInfo.restoredBy = currentUser?.id || 'System';
  }

  await empDoc.save();

  // Push real-time sync event
  emitEntitySync(companyId, {
    module: 'employees',
    action: 'restore',
    data: empDoc
  });

  // Log audit log
  await ActivityLog.create({
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    actor: currentUser?.name || 'System',
    actionType: 'Employee Restored',
    fieldChanged: 'accountStatus',
    oldValue: 'Inactive',
    newValue: 'Active',
    ip: '127.0.0.1',
    companyId
  });

  return empDoc;
};

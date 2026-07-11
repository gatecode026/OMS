/**
 * @file src/modules/leaves/leaves.service.js
 * @description Service business logic for Leaves module.
 */

import repository from './leaves.repository.js';
import logger from '../../config/logger.js';
import { createNotification } from '../notifications/notifications.service.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import { emitEntitySync } from '../../services/sync.service.js';

const notifyAdminsAndManagers = async (companyId, title, message, data = {}) => {
  try {
    // 1. Notify company admin (whose user ID is companyId)
    await createNotification(companyId, companyId, {
      type: 'leave',
      title,
      message,
      data,
      priority: 'high'
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
          type: 'leave',
          title,
          message,
          data,
          priority: 'high'
        });
      }
    }
  } catch (err) {
    logger.error('Error notifying admins and managers: ' + err.message);
  }
};

export const findAll = async (query) => {
  logger.info('Executing LeavesService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing LeavesService::findById query: ' + id);
  return repository.findOne(id);
};

const syncLeavesToAttendance = async (record, currentUser) => {
  if (record.status !== 'Approved') return;
  
  try {
    const companyId = currentUser?.companyId || record.companyId;
    if (!companyId) return;

    const conn = await getTenantConnection(companyId);
    
    // Resolve employee details to get department, branch, etc.
    const employee = await conn.collection('employees').findOne({ id: record.employeeId });
    const dept = record.department || employee?.department || '';
    const branch = record.branch || employee?.branch || '';
    const empName = record.employeeName || employee?.name || 'Employee';

    // Get dates in range
    const getDatesInRange = (fromDateStr, toDateStr) => {
      const dates = [];
      const start = new Date(fromDateStr);
      const end = new Date(toDateStr);
      while (start <= end) {
        const yyyy = start.getFullYear();
        const mm = String(start.getMonth() + 1).padStart(2, '0');
        const dd = String(start.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
        start.setDate(start.getDate() + 1);
      }
      return dates;
    };

    const dates = getDatesInRange(record.fromDate, record.toDate || record.fromDate);

    for (const date of dates) {
      // Check if record exists
      const existing = await conn.collection('attendance').findOne({
        employeeId: record.employeeId,
        date: date
      });

      if (existing) {
        // Update status to On Leave
        await conn.collection('attendance').updateOne(
          { _id: existing._id },
          { $set: { status: 'On Leave' } }
        );
        logger.info(`Updated existing attendance to 'On Leave' for employee ${record.employeeId} on ${date}`);
      } else {
        // Create new record
        const attId = `ATT-${record.employeeId}-${date}`;
        await conn.collection('attendance').insertOne({
          id: attId,
          employeeId: record.employeeId,
          employeeName: empName,
          department: dept,
          branch: branch,
          date: date,
          punchIn: '--:--',
          punchOut: '--:--',
          totalHours: 0,
          status: 'On Leave',
          source: 'System',
          breakTime: '45 mins',
          workMode: employee?.workMode || 'WFO',
          shift: employee?.shift || 'Flexible Shift',
          overtime: '0 hrs',
          companyId: companyId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        logger.info(`Created new 'On Leave' attendance record for employee ${record.employeeId} on ${date}`);
      }
    }
  } catch (err) {
    logger.error('Error syncing leave to attendance: ' + err.message);
  }
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing LeavesService::createRecord by user: ' + currentUser?.id);
  if (!data.appliedDate) {
    data.appliedDate = new Date().toISOString().split('T')[0];
  }
  if (!data.department || !data.department.trim()) {
    data.department = currentUser?.department || 'Administration';
  }
  const record = await repository.save(data);
  if (record) {
    const title = 'New Leave Request';
    const message = `${record.employeeName} (${record.department}) has applied for ${record.type} from ${record.fromDate} to ${record.toDate} (${record.days} days). Reason: ${record.reason}`;
    await notifyAdminsAndManagers(currentUser.companyId, title, message, { leaveId: record.id });
    
    // Auto-sync approved leave to attendance
    if (record.status === 'Approved') {
      await syncLeavesToAttendance(record, currentUser);
    }

    if (currentUser?.companyId) {
      emitEntitySync(currentUser.companyId, {
        module: 'leaves',
        action: 'create',
        data: record
      });
    }
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing LeavesService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.update(id, data);
  if (record) {
    try {
      await createNotification(record.employeeId, currentUser.companyId, {
        type: 'leave',
        title: `Leave Request ${record.status}`,
        message: `Your leave request for ${record.type} (${record.fromDate} to ${record.toDate}) has been ${record.status.toLowerCase()}${record.approverNotes ? ' - Note: ' + record.approverNotes : ''}.`,
        data: { leaveId: record.id },
        priority: 'normal'
      });
      logger.info(`Notification generated successfully for leave update to employee: ${record.employeeId}`);
    } catch (err) {
      logger.error('Error generating notification for leave update: ' + err.message);
    }
    
    // Auto-sync approved leave to attendance
    if (record.status === 'Approved') {
      await syncLeavesToAttendance(record, currentUser);
    }

    if (currentUser?.companyId) {
      emitEntitySync(currentUser.companyId, {
        module: 'leaves',
        action: 'update',
        data: record
      });
    }
  }
  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing LeavesService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.remove(id);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'leaves',
      action: 'delete',
      data: id
    });
  }
  return record;
};

export const findAllPolicies = async () => {
  logger.info('Executing LeavesService::findAllPolicies');
  return repository.findPolicies();
};

export const findPolicyById = async (id) => {
  logger.info('Executing LeavesService::findPolicyById: ' + id);
  return repository.findPolicyById(id);
};

export const createPolicyRecord = async (data, currentUser) => {
  logger.info('Executing LeavesService::createPolicyRecord by user: ' + currentUser?.id);
  const policy = await repository.savePolicy(data);
  return policy;
};

export const updatePolicyRecord = async (id, data, currentUser) => {
  logger.info('Executing LeavesService::updatePolicyRecord for ID: ' + id + ' by user: ' + currentUser?.id);
  return repository.updatePolicy(id, data);
};

export const deletePolicyRecord = async (id, currentUser) => {
  logger.info('Executing LeavesService::deletePolicyRecord for ID: ' + id + ' by user: ' + currentUser?.id);
  return repository.removePolicy(id);
};

export const resetPolicyRecords = async (currentUser) => {
  logger.info('Executing LeavesService::resetPolicyRecords by user: ' + currentUser?.id);
  const policies = await repository.resetPolicies();
  return policies;
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
  findAllPolicies,
  findPolicyById,
  createPolicyRecord,
  updatePolicyRecord,
  deletePolicyRecord,
  resetPolicyRecords
};

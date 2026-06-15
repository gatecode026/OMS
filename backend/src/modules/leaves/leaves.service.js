/**
 * @file src/modules/leaves/leaves.service.js
 * @description Service business logic for Leaves module.
 */

import repository from './leaves.repository.js';
import logger from '../../config/logger.js';
import Notification from '../notifications/notification.model.js';

export const findAll = async (query) => {
  logger.info('Executing LeavesService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing LeavesService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing LeavesService::createRecord by user: ' + currentUser?.id);
  if (!data.appliedDate) {
    data.appliedDate = new Date().toISOString().split('T')[0];
  }
  const record = await repository.save(data);
  if (record) {
    try {
      const notifId = `NTF-${Math.floor(100000 + Math.random() * 900000)}`;
      await Notification.create({
        id: notifId,
        type: 'leave',
        title: 'New Leave Request',
        message: `${record.employeeName} (${record.department}) has applied for ${record.type} from ${record.fromDate} to ${record.toDate} (${record.days} days). Reason: ${record.reason}`,
        time: 'Just now',
        category: 'Leave',
        priority: 'High',
        recipientType: 'super_admin',
        sentBy: record.employeeName || 'System',
        sentDate: new Date().toISOString().split('T')[0],
        deliveryStatus: 'Delivered',
        readStatus: 'Unread',
        recipients: 1
      });
      logger.info(`Notification generated successfully for new leave request: ${notifId}`);
    } catch (err) {
      logger.error('Error generating notification for leave creation: ' + err.message);
    }
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing LeavesService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.update(id, data);
  if (record) {
    try {
      const notifId = `NTF-${Math.floor(100000 + Math.random() * 900000)}`;
      await Notification.create({
        id: notifId,
        type: 'leave',
        title: `Leave Request ${record.status}`,
        message: `Your leave request for ${record.type} (${record.fromDate} to ${record.toDate}) has been ${record.status.toLowerCase()}${record.approverNotes ? ' - Note: ' + record.approverNotes : ''}.`,
        time: 'Just now',
        category: 'Leave',
        priority: 'Normal',
        recipientType: 'employee',
        recipientId: record.employeeId,
        targetUserId: record.employeeId,
        forUserId: record.employeeId,
        sentBy: currentUser?.name || 'Admin',
        sentDate: new Date().toISOString().split('T')[0],
        deliveryStatus: 'Delivered',
        readStatus: 'Unread',
        recipients: 1
      });
      logger.info(`Notification generated successfully for leave update: ${notifId}`);
    } catch (err) {
      logger.error('Error generating notification for leave update: ' + err.message);
    }
  }
  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing LeavesService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
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

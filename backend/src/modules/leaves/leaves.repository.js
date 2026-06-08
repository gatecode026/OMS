/**
 * @file src/modules/leaves/leaves.repository.js
 * @description Data Access layer for Leaves module.
 */

import Leave from './leaves.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.debug('Executing LeavesRepository::find', query);
  const filters = { isPolicy: { $ne: true } };
  if (query.employeeId) filters.employeeId = query.employeeId;
  if (query.status) filters.status = query.status;
  if (query.type) filters.type = query.type;
  if (query.department) filters.department = query.department;
  
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filters.$or = [
      { employeeName: regex },
      { employeeId: regex },
      { department: regex }
    ];
  }
  
  return Leave.find(filters).sort({ appliedDate: -1, createdAt: -1 });
};

export const findOne = async (id) => {
  logger.debug('Executing LeavesRepository::findOne for ID: ' + id);
  return Leave.findOne({ id, isPolicy: { $ne: true } });
};

export const save = async (data) => {
  logger.debug('Executing LeavesRepository::save', data);
  const id = data.id || `LR-${Math.floor(100 + Math.random() * 900)}`;
  return Leave.create({ ...data, id, isPolicy: false });
};

export const update = async (id, data) => {
  logger.debug('Executing LeavesRepository::update for ID: ' + id, data);
  return Leave.findOneAndUpdate({ id, isPolicy: { $ne: true } }, data, { new: true });
};

export const remove = async (id) => {
  logger.debug('Executing LeavesRepository::remove for ID: ' + id);
  return Leave.findOneAndDelete({ id, isPolicy: { $ne: true } });
};

export const findPolicies = async () => {
  logger.debug('Executing LeavesRepository::findPolicies');
  return Leave.find({ isPolicy: true }).sort({ id: 1 });
};

export const findPolicyById = async (id) => {
  logger.debug('Executing LeavesRepository::findPolicyById for ID: ' + id);
  return Leave.findOne({ id, isPolicy: true });
};

export const savePolicy = async (data) => {
  logger.debug('Executing LeavesRepository::savePolicy', data);
  return Leave.create({ ...data, isPolicy: true });
};

export const updatePolicy = async (id, data) => {
  logger.debug('Executing LeavesRepository::updatePolicy for ID: ' + id, data);
  return Leave.findOneAndUpdate({ id, isPolicy: true }, data, { new: true });
};

export const removePolicy = async (id) => {
  logger.debug('Executing LeavesRepository::removePolicy for ID: ' + id);
  return Leave.findOneAndDelete({ id, isPolicy: true });
};

export const resetPolicies = async () => {
  logger.debug('Executing LeavesRepository::resetPolicies');
  await Leave.deleteMany({ isPolicy: true });
  const defaultPolicies = [
    { id: 'POL-001', leaveCode: 'CL', leaveName: 'Casual Leave', defaultDays: 8, maxCarryForward: 5, isActive: true, genderRestriction: 'All', description: 'For personal urgent reasons or brief errands', isPolicy: true },
    { id: 'POL-002', leaveCode: 'SL', leaveName: 'Sick Leave', defaultDays: 10, maxCarryForward: 3, isActive: true, genderRestriction: 'All', description: 'For medical recovery or doctor consultations', isPolicy: true },
    { id: 'POL-003', leaveCode: 'PL', leaveName: 'Paid Leave', defaultDays: 15, maxCarryForward: 10, isActive: true, genderRestriction: 'All', description: 'Annual leave for vacation or relaxation', isPolicy: true },
    { id: 'POL-004', leaveCode: 'ML', leaveName: 'Maternity Leave', defaultDays: 180, maxCarryForward: 0, isActive: true, genderRestriction: 'Female', description: 'For expectant mothers around childbirth', isPolicy: true },
    { id: 'POL-010', leaveCode: 'UL', leaveName: 'Unpaid Leave', defaultDays: 30, maxCarryForward: 0, isActive: true, genderRestriction: 'All', description: 'Without pay when balances exhausted', isPolicy: true }
  ];
  return Leave.insertMany(defaultPolicies);
};

export default {
  find,
  findOne,
  save,
  update,
  remove,
  findPolicies,
  findPolicyById,
  savePolicy,
  updatePolicy,
  removePolicy,
  resetPolicies
};


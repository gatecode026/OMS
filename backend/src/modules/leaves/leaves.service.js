/**
 * @file src/modules/leaves/leaves.service.js
 * @description Service business logic for Leaves module.
 */

import repository from './leaves.repository.js';
import logger from '../../config/logger.js';
import Employee from '../employees/employees.model.js';
import Leave from './leaves.model.js';

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
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing LeavesService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
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
  
  if (policy) {
    try {
      const query = {};
      if (policy.genderRestriction === 'Male') {
        query.gender = 'Male';
      } else if (policy.genderRestriction === 'Female') {
        query.gender = 'Female';
      }
      
      const employees = await Employee.find(query);
      
      if (employees && employees.length > 0) {
        const fromDate = new Date().toISOString().split('T')[0];
        const start = new Date(fromDate);
        const end = new Date(start);
        end.setDate(start.getDate() + (policy.defaultDays || 1) - 1);
        const toDate = end.toISOString().split('T')[0];
        
        const leaveRecords = employees.map(emp => ({
          id: `LR-${Math.floor(100000 + Math.random() * 900000)}`,
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department || 'Engineering',
          type: policy.leaveName,
          fromDate,
          toDate,
          days: policy.defaultDays,
          reason: `Automatic policy allocation: ${policy.leaveName}`,
          status: 'Approved',
          appliedDate: fromDate,
          history: [
            { date: fromDate, status: 'Approved', comment: `Leave policy ${policy.leaveName} applied` }
          ],
          approverNotes: 'Automatically assigned'
        }));
        
        await Leave.insertMany(leaveRecords);
        logger.info(`Automatically created ${leaveRecords.length} leave records for policy ${policy.leaveName}`);
      }
    } catch (err) {
      logger.error('Error auto-creating leaves for policy: ' + err.message);
    }
  }
  
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
  
  if (policies && policies.length > 0) {
    try {
      const fromDate = new Date().toISOString().split('T')[0];
      const start = new Date(fromDate);
      
      const allEmployees = await Employee.find({});
      
      const leaveRecords = [];
      for (const policy of policies) {
        const queryEmployees = allEmployees.filter(emp => {
          if (policy.genderRestriction === 'Male') return emp.gender === 'Male';
          if (policy.genderRestriction === 'Female') return emp.gender === 'Female';
          return true;
        });
        
        const end = new Date(start);
        end.setDate(start.getDate() + (policy.defaultDays || 1) - 1);
        const toDate = end.toISOString().split('T')[0];
        
        for (const emp of queryEmployees) {
          leaveRecords.push({
            id: `LR-${Math.floor(100000 + Math.random() * 900000)}`,
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department || 'Engineering',
            type: policy.leaveName,
            fromDate,
            toDate,
            days: policy.defaultDays,
            reason: `Automatic policy allocation: ${policy.leaveName}`,
            status: 'Approved',
            appliedDate: fromDate,
            history: [
              { date: fromDate, status: 'Approved', comment: `Leave policy ${policy.leaveName} applied` }
            ],
            approverNotes: 'Automatically assigned'
          });
        }
      }
      
      if (leaveRecords.length > 0) {
        await Leave.insertMany(leaveRecords);
        logger.info(`Automatically created ${leaveRecords.length} leave records on policy reset`);
      }
    } catch (err) {
      logger.error('Error auto-creating leaves on policy reset: ' + err.message);
    }
  }
  
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

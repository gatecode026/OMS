/**
 * @file src/modules/branches/branches.repository.js
 * @description Data Access layer for Branches module using Mongoose.
 */

import Branch from './branches.model.js';
import Employee from '../employees/employees.model.js';
import logger from '../../config/logger.js';

/**
 * Enriches a branch object with real-time manager details from the employees collection.
 */
const enrichBranchWithManager = async (branch) => {
  if (!branch) return null;
  const branchObj = branch.toObject ? branch.toObject() : branch;
  if (branchObj.managerId) {
    const manager = await Employee.findOne({ id: branchObj.managerId });
    if (manager) {
      branchObj.manager = manager.name;
      branchObj.managerPhone = manager.phone || '';
      branchObj.managerEmail = manager.email || '';
    }
  }
  return branchObj;
};

export const find = async (query = {}) => {
  logger.info('BranchesRepository::find querying branches from database...');
  const branches = await Branch.find(query);
  return Promise.all(branches.map(enrichBranchWithManager));
};

export const findOne = async (id) => {
  logger.info(`BranchesRepository::findOne querying branch with ID: ${id}`);
  const branch = await Branch.findOne({ id });
  return enrichBranchWithManager(branch);
};

export const save = async (data) => {
  logger.info(`BranchesRepository::save creating branch: ${data.name}`);
  const branch = await Branch.create(data);
  return enrichBranchWithManager(branch);
};

export const update = async (id, data) => {
  logger.info(`BranchesRepository::update updating branch with ID: ${id}`);
  const branch = await Branch.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
  return enrichBranchWithManager(branch);
};

export const remove = async (id) => {
  logger.info(`BranchesRepository::remove deleting branch with ID: ${id}`);
  const branch = await Branch.findOneAndDelete({ id });
  return enrichBranchWithManager(branch);
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

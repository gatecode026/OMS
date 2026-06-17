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
    const manager = await Employee.findOne({ id: branchObj.managerId }).select('name phone email').lean();
    if (manager) {
      branchObj.manager = manager.name;
      branchObj.managerPhone = manager.phone || '';
      branchObj.managerEmail = manager.email || '';
    }
  }
  return branchObj;
};

/**
 * Compute live employee counts per branch name for a given companyId.
 * Returns a Map of { branchName (lowercase) => { total, onLeave } }
 */
const computeBranchCounts = async (companyId) => {
  try {
    const rows = await Employee.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: { $toLower: { $ifNull: ['$branch', ''] } },
          total: { $sum: 1 },
          onLeave: {
            $sum: {
              $cond: [
                { $in: ['$attendanceStatus', ['On Leave', 'Leave', 'Half Day']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    const map = new Map();
    for (const r of rows) {
      if (r._id) map.set(r._id, { total: r.total, onLeave: r.onLeave });
    }
    return map;
  } catch (err) {
    logger.error('BranchesRepository::computeBranchCounts aggregation error:', err);
    return new Map();
  }
};

export const find = async (query = {}) => {
  logger.info('BranchesRepository::find querying branches from database...');
  const branches = await Branch.find(query);
  const enriched = await Promise.all(branches.map(enrichBranchWithManager));

  // Determine companyId for the aggregation
  const companyId = enriched.length > 0 ? enriched[0].companyId : null;
  const countsMap = companyId ? await computeBranchCounts(companyId) : new Map();

  return enriched.map(branch => {
    const key = (branch.name || '').toLowerCase();
    const liveData = countsMap.get(key);
    return {
      ...branch,
      employeeCount: liveData ? liveData.total : (branch.employeeCount || 0),
      employeesOnLeave: liveData ? liveData.onLeave : (branch.employeesOnLeave || 0)
    };
  });
};

export const findOne = async (id) => {
  logger.info(`BranchesRepository::findOne querying branch with ID: ${id}`);
  const branch = await Branch.findOne({ id });
  const enriched = await enrichBranchWithManager(branch);
  if (!enriched) return null;

  const countsMap = enriched.companyId ? await computeBranchCounts(enriched.companyId) : new Map();
  const key = (enriched.name || '').toLowerCase();
  const liveData = countsMap.get(key);
  return {
    ...enriched,
    employeeCount: liveData ? liveData.total : (enriched.employeeCount || 0),
    employeesOnLeave: liveData ? liveData.onLeave : (enriched.employeesOnLeave || 0)
  };
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

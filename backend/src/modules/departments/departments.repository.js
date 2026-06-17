/**
 * @file src/modules/departments/departments.repository.js
 * @description Data Access layer for Departments module using MongoDB.
 */

import Department from './departments.model.js';
import Employee from '../employees/employees.model.js';
import Team from '../teams/teams.model.js';
import Project from '../projects/projects.model.js';
import logger from '../../config/logger.js';

/**
 * Compute live employee counts per department name for a given companyId.
 * Returns a Map of { deptName (lowercase) => { total } }
 */
const computeDeptCounts = async (companyId) => {
  try {
    const rows = await Employee.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: { $toLower: { $trim: { input: { $ifNull: ['$department', ''] } } } },
          total: { $sum: 1 }
        }
      }
    ]);
    const map = new Map();
    for (const r of rows) {
      if (r._id) map.set(r._id, r.total);
    }
    return map;
  } catch (err) {
    logger.error('DepartmentsRepository::computeDeptCounts aggregation error:', err);
    return new Map();
  }
};

/**
 * Compute live active teams per department name for a given companyId.
 * Returns a Map of { deptName (lowercase) => count }
 */
const computeDeptTeams = async (companyId) => {
  try {
    const rows = await Team.aggregate([
      { $match: { companyId, status: 'Active' } },
      {
        $group: {
          _id: { $toLower: { $trim: { input: { $ifNull: ['$department', ''] } } } },
          total: { $sum: 1 }
        }
      }
    ]);
    const map = new Map();
    for (const r of rows) {
      if (r._id) map.set(r._id, r.total);
    }
    return map;
  } catch (err) {
    logger.error('DepartmentsRepository::computeDeptTeams aggregation error:', err);
    return new Map();
  }
};

/**
 * Compute live project stats per department name for a given companyId.
 * Returns a Map of { deptName (lowercase) => { total, active, completed, pending, delayed } }
 */
const computeDeptProjectStats = async (companyId) => {
  try {
    const rows = await Project.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: { $toLower: { $trim: { input: { $ifNull: ['$department', ''] } } } },
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $in: ['$status', ['Active', 'In Progress']] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ['$status', ['Pending', 'Planning', 'On Hold']] }, 1, 0] } },
          delayed: { $sum: { $cond: [{ $eq: ['$status', 'Delayed'] }, 1, 0] } }
        }
      }
    ]);
    const map = new Map();
    for (const r of rows) {
      if (r._id) {
        map.set(r._id, {
          total: r.total,
          active: r.active,
          completed: r.completed,
          pending: r.pending,
          delayed: r.delayed
        });
      }
    }
    return map;
  } catch (err) {
    logger.error('DepartmentsRepository::computeDeptProjectStats aggregation error:', err);
    return new Map();
  }
};

export const find = async (query = {}) => {
  logger.info('DepartmentsRepository::find querying departments from database...');
  const departments = await Department.find(query).lean();

  // Determine companyId for the aggregation
  const companyId = departments.length > 0 ? departments[0].companyId : null;
  const countsMap = companyId ? await computeDeptCounts(companyId) : new Map();
  const teamsMap = companyId ? await computeDeptTeams(companyId) : new Map();
  const projectsMap = companyId ? await computeDeptProjectStats(companyId) : new Map();

  return departments.map(dept => {
    const key = (dept.name || '').toLowerCase().trim();
    const liveCount = countsMap.get(key);
    const liveTeams = teamsMap.get(key);
    const liveProjStats = projectsMap.get(key) || { total: 0, active: 0, completed: 0, pending: 0, delayed: 0 };
    return {
      ...dept,
      employeeCount: liveCount !== undefined ? liveCount : (dept.employeeCount || 0),
      activeTeams: liveTeams !== undefined ? liveTeams : (dept.activeTeams || 0),
      projects: liveProjStats.total !== undefined ? liveProjStats.total : (dept.projects || 0),
      activeProjects: liveProjStats.active !== undefined ? liveProjStats.active : (dept.activeProjects || 0),
      completedProjects: liveProjStats.completed !== undefined ? liveProjStats.completed : (dept.completedProjects || 0),
      pendingProjects: liveProjStats.pending !== undefined ? liveProjStats.pending : (dept.pendingProjects || 0),
      delayedProjects: liveProjStats.delayed !== undefined ? liveProjStats.delayed : (dept.delayedProjects || 0)
    };
  });
};

export const findOne = async (id) => {
  logger.info(`DepartmentsRepository::findOne querying department with ID: ${id}`);
  const dept = await Department.findOne({ id }).lean();
  if (!dept) return null;

  const companyId = dept.companyId;
  const countsMap = companyId ? await computeDeptCounts(companyId) : new Map();
  const teamsMap = companyId ? await computeDeptTeams(companyId) : new Map();
  const projectsMap = companyId ? await computeDeptProjectStats(companyId) : new Map();

  const key = (dept.name || '').toLowerCase().trim();
  const liveCount = countsMap.get(key);
  const liveTeams = teamsMap.get(key);
  const liveProjStats = projectsMap.get(key) || { total: 0, active: 0, completed: 0, pending: 0, delayed: 0 };

  return {
    ...dept,
    employeeCount: liveCount !== undefined ? liveCount : (dept.employeeCount || 0),
    activeTeams: liveTeams !== undefined ? liveTeams : (dept.activeTeams || 0),
    projects: liveProjStats.total !== undefined ? liveProjStats.total : (dept.projects || 0),
    activeProjects: liveProjStats.active !== undefined ? liveProjStats.active : (dept.activeProjects || 0),
    completedProjects: liveProjStats.completed !== undefined ? liveProjStats.completed : (dept.completedProjects || 0),
    pendingProjects: liveProjStats.pending !== undefined ? liveProjStats.pending : (dept.pendingProjects || 0),
    delayedProjects: liveProjStats.delayed !== undefined ? liveProjStats.delayed : (dept.delayedProjects || 0)
  };
};

export const save = async (data) => {
  logger.info(`DepartmentsRepository::save creating department: ${data.name}`);

  // Assign a default rotating accent color automatically since the picker was removed
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
  const count = await Department.countDocuments();
  if (!data.color) {
    data.color = colors[count % colors.length];
  }

  return Department.create(data);
};

export const update = async (id, data) => {
  logger.info(`DepartmentsRepository::update updating department with ID: ${id}`);
  return Department.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const remove = async (id) => {
  logger.info(`DepartmentsRepository::remove deleting department with ID: ${id}`);
  return Department.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

/**
 * @file src/modules/projects/projects.repository.js
 * @description Data Access layer for Projects module.
 */

import Project from './projects.model.js';
import Department from '../departments/departments.model.js';
import logger from '../../config/logger.js';

/**
 * Recalculate project and task stats for a department and update it in the Department collection.
 */
export const syncDeptProjectStats = async (companyId, departmentNames) => {
  if (!companyId || !departmentNames || departmentNames.length === 0) return;
  
  // Normalize and clean department names
  const normalizedDepts = [...new Set(departmentNames.map(d => d.trim()).filter(Boolean))];
  
  for (const deptName of normalizedDepts) {
    try {
      // Find all projects for this company and department (case-insensitive regex match)
      const projects = await Project.find({
        companyId,
        department: { $regex: new RegExp(`^${deptName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
      }).lean();
      
      const total = projects.length;
      const active = projects.filter(p => ['Active', 'In Progress'].includes(p.status)).length;
      const completed = projects.filter(p => p.status === 'Completed').length;
      const pending = projects.filter(p => ['Pending', 'Planning', 'On Hold'].includes(p.status)).length;
      const delayed = projects.filter(p => p.status === 'Delayed').length;
      
      let tasksCompleted = 0;
      let tasksInProgress = 0;
      
      projects.forEach(p => {
        if (p.tasks && Array.isArray(p.tasks)) {
          p.tasks.forEach(t => {
            if (t.completed) {
              tasksCompleted++;
            } else {
              tasksInProgress++;
            }
          });
        }
      });
      
      // Update the Department document(s) in the database
      const updateResult = await Department.updateMany(
        {
          companyId,
          name: { $regex: new RegExp(`^${deptName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        },
        {
          $set: {
            projects: total,
            activeProjects: active,
            completedProjects: completed,
            pendingProjects: pending,
            delayedProjects: delayed,
            tasksCompleted,
            tasksInProgress
          }
        }
      );
      
      logger.info(`[SYNC STATS] Synced project stats for department "${deptName}" of company "${companyId}": projects=${total}, activeProjects=${active}, completedProjects=${completed}, pendingProjects=${pending}, delayedProjects=${delayed}, tasksCompleted=${tasksCompleted}, tasksInProgress=${tasksInProgress}. Updated ${updateResult.modifiedCount} department docs.`);
    } catch (err) {
      logger.error(`[SYNC STATS] Error syncing project stats for department "${deptName}" of company "${companyId}":`, err);
    }
  }
};

export const find = async (query = {}) => {
  logger.debug('Executing ProjectsRepository::find', query);
  const filter = {};
  if (query.department) {
    filter.department = query.department;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.priority) {
    filter.priority = query.priority;
  }
  return Project.find(filter).sort({ id: 1 });
};

export const findOne = async (id) => {
  logger.debug('Executing ProjectsRepository::findOne for: ' + id);
  return Project.findOne({ id });
};

export const save = async (data) => {
  logger.debug('Executing ProjectsRepository::save', data);
  if (!data.id) {
    const count = await Project.countDocuments();
    data.id = `PRJ-${String(count + 1).padStart(3, '0')}`;
  }
  const newProj = await Project.create(data);
  if (newProj && newProj.companyId && newProj.department) {
    syncDeptProjectStats(newProj.companyId, [newProj.department]).catch(err => 
      logger.error('Error in deferred syncDeptProjectStats (save):', err)
    );
  }
  return newProj;
};

export const update = async (id, data) => {
  logger.debug('Executing ProjectsRepository::update for: ' + id, data);
  // Find the old project first to know its department/companyId in case they changed
  const oldProj = await Project.findOne({ id }).lean();
  const updatedProj = await Project.findOneAndUpdate({ id }, data, { new: true });
  
  const affectedDepts = [];
  let companyId = null;
  if (oldProj) {
    companyId = oldProj.companyId;
    if (oldProj.department) affectedDepts.push(oldProj.department);
  }
  if (updatedProj) {
    companyId = updatedProj.companyId || companyId;
    if (updatedProj.department) affectedDepts.push(updatedProj.department);
  }
  
  if (companyId && affectedDepts.length > 0) {
    syncDeptProjectStats(companyId, affectedDepts).catch(err =>
      logger.error('Error in deferred syncDeptProjectStats (update):', err)
    );
  }
  return updatedProj;
};

export const remove = async (id) => {
  logger.debug('Executing ProjectsRepository::remove for: ' + id);
  const oldProj = await Project.findOne({ id }).lean();
  const deletedProj = await Project.findOneAndDelete({ id });
  
  if (oldProj && oldProj.companyId && oldProj.department) {
    syncDeptProjectStats(oldProj.companyId, [oldProj.department]).catch(err =>
      logger.error('Error in deferred syncDeptProjectStats (remove):', err)
    );
  }
  return deletedProj;
};

export default {
  find,
  findOne,
  save,
  update,
  remove,
  syncDeptProjectStats
};

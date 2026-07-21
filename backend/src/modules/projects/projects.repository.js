/**
 * @file src/modules/projects/projects.repository.js
 * @description Data Access layer for Projects module, secured by the Enterprise Authorization Framework.
 */

import Project from './projects.model.js';
import Department from '../departments/departments.model.js';
import logger from '../../config/logger.js';

// Security and Query Builder Imports
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { 
  validateRepositoryAccess, 
  sanitizeQueryOperators, 
  getQueryLogging
} from '../../security/repositoryContract.js';
import { logSecurityEvent } from '../../security/auditLogger.js';
import { ProjectsQueryBuilder } from './projects.queryBuilder.js';
import { getStore } from '../../utils/tenantContext.js';

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
  const context = resolveSecurityContext();
  const builder = new ProjectsQueryBuilder(context);

  sanitizeQueryOperators(query);

  const filters = {};
  if (query.branch) filters.branch = query.branch;
  if (query.department) filters.department = query.department;
  if (query.status) filters.status = query.status;
  if (query.priority) filters.priority = query.priority;

  const scopedFilters = builder.buildReadQuery(filters);

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] ProjectsRepository::find:
    - Query: ${JSON.stringify(query)}
    - Scope: ${JSON.stringify(scopedFilters)}`);
  }

  return Project.find(scopedFilters).sort({ id: 1 });
};

export const findOne = async (id) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id });

  const project = await Project.findOne({ id });

  if (project && context) {
    // If employee, verify membership
    if (context.isEmployee) {
      const store = getStore();
      const userName = store?.user?.name || '';
      const isMember = project.members && project.members.map(m => m.toLowerCase()).includes(userName.toLowerCase());
      if (!isMember) {
        logSecurityEvent(context, 'Projects', 'read', 'OWNERSHIP_DENIED', 'DENIED', 'Access Denied: User is not a member of the project', id);
        const err = new Error('Access denied: You are not a member of this project.');
        err.statusCode = 403;
        throw err;
      }
    }

    await validateRepositoryAccess('read', project, {
      ownerIdFields: [],
      moduleName: 'Projects'
    });
  }

  return project;
};

export const save = async (data) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(data);

  if (context) {
    await validateRepositoryAccess('create', data, {
      ownerIdFields: [],
      moduleName: 'Projects'
    });
  }

  logger.debug('Executing ProjectsRepository::save', data);
  if (!data.id || data.id.trim() === '') {
    const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
    let uniqueId;
    let exists = true;
    let maxAttempts = 100;
    while (exists && maxAttempts > 0) {
      maxAttempts--;
      uniqueId = await generateCompanyUniqueId(data.companyId || context?.companyId, 'projects');
      const existing = await Project.findOne({ id: uniqueId }).lean();
      if (!existing) {
        exists = false;
      }
    }
    data.id = uniqueId;
  }
  if (!data.projectCode || data.projectCode.trim() === '') {
    data.projectCode = data.id;
  }

  // Auto-resolve branch from department
  if (data.department && (!data.branch || data.branch.trim() === '')) {
    const dept = await Department.findOne({ name: { $regex: new RegExp(`^${data.department.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } });
    if (dept) {
      data.branch = dept.branch;
    }
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
  const context = resolveSecurityContext();
  sanitizeQueryOperators(data);

  const project = await Project.findOne({ id });
  if (!project) return null;

  if (context) {
    // If employee, verify membership
    if (context.isEmployee) {
      const store = getStore();
      const userName = store?.user?.name || '';
      const isMember = project.members && project.members.map(m => m.toLowerCase()).includes(userName.toLowerCase());
      if (!isMember) {
        logSecurityEvent(context, 'Projects', 'update', 'OWNERSHIP_DENIED', 'DENIED', 'Access Denied: User is not a member of the project', id);
        const err = new Error('Access denied: You are not a member of this project.');
        err.statusCode = 403;
        throw err;
      }
    }

    await validateRepositoryAccess('update', project, {
      ownerIdFields: [],
      updatePayload: data,
      moduleName: 'Projects'
    });
  }

  logger.debug('Executing ProjectsRepository::update for: ' + id, data);
  const oldProj = project.toObject();

  // If the manager is being changed, update all pending Project Manager Approvals in tasks
  if (data.manager && data.manager !== project.manager) {
    if (project.tasks && Array.isArray(project.tasks)) {
      project.tasks.forEach(task => {
        if (task.approvals && Array.isArray(task.approvals)) {
          task.approvals.forEach(approval => {
            if (approval.role === 'Project Manager Approval' && approval.status === 'Pending') {
              approval.approver = data.manager;
            }
          });
        }
      });
      project.markModified('tasks');
    }
  }

  // Auto-transition project status to 'Active' if tasks are assigned and current status is Pending/Planning
  if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
    if (project.status === 'Pending' || project.status === 'Planning') {
      project.status = 'Active';
      data.status = 'Active';
    }
  }

  Object.assign(project, data);

  // Auto-resolve branch from department on update
  if (project.department) {
    const dept = await Department.findOne({ name: { $regex: new RegExp(`^${project.department.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } });
    if (dept) {
      project.branch = dept.branch;
    }
  }

  const updatedProj = await project.save();
  
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
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id });

  const project = await Project.findOne({ id });
  if (!project) return null;

  if (context) {
    // If employee, verify membership
    if (context.isEmployee) {
      const store = getStore();
      const userName = store?.user?.name || '';
      const isMember = project.members && project.members.map(m => m.toLowerCase()).includes(userName.toLowerCase());
      if (!isMember) {
        logSecurityEvent(context, 'Projects', 'delete', 'OWNERSHIP_DENIED', 'DENIED', 'Access Denied: User is not a member of the project', id);
        const err = new Error('Access denied: You are not a member of this project.');
        err.statusCode = 403;
        throw err;
      }
    }

    await validateRepositoryAccess('delete', project, {
      ownerIdFields: [],
      moduleName: 'Projects'
    });
  }

  logger.debug('Executing ProjectsRepository::remove for: ' + id);
  const oldProj = project.toObject();
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

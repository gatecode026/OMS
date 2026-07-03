/**
 * @file src/modules/projects/projects.service.js
 * @description Service business logic for Projects module.
 */

import repository from './projects.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query, currentUser) => {
  logger.info('Executing ProjectsService::findAll query');
  const role = currentUser?.role?.toLowerCase();
  
  // 1. If super_admin or company_admin, return all projects
  if (!role || ['super_admin', 'company_admin', 'superadmin', 'companyadmin'].includes(role)) {
    return repository.find(query);
  }

  // 2. Build branch and department restrictions
  const branch = currentUser?.branch;
  const department = currentUser?.department;
  const name = currentUser?.name;

  // Let's retrieve all projects
  const allProjects = await repository.find(query);

  // Filter based on roles
  if (role === 'branch_admin') {
    // Branch admins see all projects in their branch (or empty branch)
    return allProjects.filter(p => !p.branch || p.branch === branch);
  }

  // dept_admin, manager, team_leader, and employee see only projects in their branch & department, OR where they are manager, leader, or member
  return allProjects.filter(p => {
    const isBranchMatch = !p.branch || p.branch === branch;
    const isDeptMatch = p.department && p.department.toLowerCase() === department?.toLowerCase();
    
    const isManager = p.manager && p.manager.toLowerCase() === name?.toLowerCase();
    const isLeader = p.leader && p.leader.toLowerCase() === name?.toLowerCase();
    const isMember = p.members && p.members.map(m => m.toLowerCase()).includes(name?.toLowerCase());

    return (isBranchMatch && isDeptMatch) || isManager || isLeader || isMember;
  });
};

export const findById = async (id, currentUser) => {
  logger.info('Executing ProjectsService::findById query: ' + id);
  const project = await repository.findOne(id);
  if (!project) return null;

  // Apply same isolation rules for single project retrieval
  const role = currentUser?.role?.toLowerCase();
  if (!role || ['super_admin', 'company_admin', 'superadmin', 'companyadmin'].includes(role)) {
    return project;
  }

  const branch = currentUser?.branch;
  const department = currentUser?.department;
  const name = currentUser?.name;

  if (role === 'branch_admin') {
    if (!project.branch || project.branch === branch) {
      return project;
    }
    return null;
  }

  const isBranchMatch = !project.branch || project.branch === branch;
  const isDeptMatch = project.department && project.department.toLowerCase() === department?.toLowerCase();
  const isManager = project.manager && project.manager.toLowerCase() === name?.toLowerCase();
  const isLeader = project.leader && project.leader.toLowerCase() === name?.toLowerCase();
  const isMember = project.members && project.members.map(m => m.toLowerCase()).includes(name?.toLowerCase());

  if ((isBranchMatch && isDeptMatch) || isManager || isLeader || isMember) {
    return project;
  }
  return null;
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing ProjectsService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing ProjectsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing ProjectsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

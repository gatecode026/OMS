import { getStore } from '../../utils/tenantContext.js';

export class ProjectsQueryBuilder {
  constructor(securityContext) {
    this.context = securityContext;
  }

  buildReadQuery(incomingQuery = {}) {
    const filters = { ...incomingQuery };

    if (!this.context) return filters;

    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    const store = getStore();
    const userName = store?.user?.name || '';

    // Branch Admin / Branch Manager / general manager
    if (this.context.role === 'branch_admin' || this.context.role === 'branch_manager' || this.context.role === 'manager') {
      if (this.context.branch) {
        filters.branch = this.context.branch;
      }
      return filters;
    }

    // Department Manager
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      if (this.context.branch) filters.branch = this.context.branch;
      if (this.context.department) filters.department = this.context.department;
      return filters;
    }

    // Team Leader
    if (this.context.isTeamLeader) {
      if (this.context.branch) filters.branch = this.context.branch;
      if (this.context.department) filters.department = this.context.department;
      
      filters.$or = [
        { leader: { $regex: new RegExp(`^${userName}$`, 'i') } },
        { manager: { $regex: new RegExp(`^${userName}$`, 'i') } },
        { members: { $regex: new RegExp(`^${userName}$`, 'i') } }
      ];
      return filters;
    }

    // Employee - strictly members of the project
    if (this.context.isEmployee) {
      filters.members = { $regex: new RegExp(`^${userName}$`, 'i') };
      return filters;
    }

    return filters;
  }

  buildWriteQuery(id) {
    const filters = { id };

    if (!this.context) return filters;

    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    const store = getStore();
    const userName = store?.user?.name || '';

    // Branch Admin / Manager
    if (this.context.role === 'branch_admin' || this.context.role === 'branch_manager' || this.context.role === 'manager') {
      if (this.context.branch) filters.branch = this.context.branch;
      return filters;
    }

    // Department Manager
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      if (this.context.branch) filters.branch = this.context.branch;
      if (this.context.department) filters.department = this.context.department;
      return filters;
    }

    // Team Leader
    if (this.context.isTeamLeader) {
      if (this.context.branch) filters.branch = this.context.branch;
      if (this.context.department) filters.department = this.context.department;
      filters.$or = [
        { leader: { $regex: new RegExp(`^${userName}$`, 'i') } },
        { manager: { $regex: new RegExp(`^${userName}$`, 'i') } },
        { members: { $regex: new RegExp(`^${userName}$`, 'i') } }
      ];
      return filters;
    }

    // Employee - default write limits (no writes, but scoped for safety)
    if (this.context.isEmployee) {
      filters.members = { $regex: new RegExp(`^${userName}$`, 'i') };
    }

    return filters;
  }
}

export default ProjectsQueryBuilder;

import Employee from '../employees/employees.model.js';

export class TasksQueryBuilder {
  constructor(securityContext) {
    this.context = securityContext;
  }

  async buildReadQuery(incomingQuery = {}) {
    const filters = { ...incomingQuery };

    if (!this.context) return filters;

    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    // Branch Admin / Manager
    if (this.context.role === 'branch_admin' || this.context.role === 'branch_manager' || this.context.role === 'manager') {
      if (this.context.branch) {
        const emps = await Employee.find({ branch: this.context.branch }).select('id').lean();
        const empIds = emps.map(e => e.id);
        filters.assigneeId = { $in: empIds };
      }
      return filters;
    }

    // Department Manager
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      const criteria = {};
      if (this.context.branch) criteria.branch = this.context.branch;
      if (this.context.department) criteria.department = this.context.department;
      
      const emps = await Employee.find(criteria).select('id').lean();
      const empIds = emps.map(e => e.id);
      filters.assigneeId = { $in: empIds };
      return filters;
    }

    // Team Leader
    if (this.context.isTeamLeader) {
      const teamEmployeeIds = this.context.teamEmployeeIds || [];
      filters.assigneeId = { $in: teamEmployeeIds };
      return filters;
    }

    // Employee
    if (this.context.isEmployee) {
      filters.assigneeId = this.context.userId;
      return filters;
    }

    return filters;
  }

  async buildWriteQuery(id) {
    const filters = { id };

    if (!this.context) return filters;

    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    // Branch Admin / Manager
    if (this.context.role === 'branch_admin' || this.context.role === 'branch_manager' || this.context.role === 'manager') {
      if (this.context.branch) {
        const emps = await Employee.find({ branch: this.context.branch }).select('id').lean();
        const empIds = emps.map(e => e.id);
        filters.assigneeId = { $in: empIds };
      }
      return filters;
    }

    // Department Manager
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      const criteria = {};
      if (this.context.branch) criteria.branch = this.context.branch;
      if (this.context.department) criteria.department = this.context.department;
      
      const emps = await Employee.find(criteria).select('id').lean();
      const empIds = emps.map(e => e.id);
      filters.assigneeId = { $in: empIds };
      return filters;
    }

    // Team Leader
    if (this.context.isTeamLeader) {
      const teamEmployeeIds = this.context.teamEmployeeIds || [];
      filters.assigneeId = { $in: teamEmployeeIds };
      return filters;
    }

    // Employee
    if (this.context.isEmployee) {
      filters.assigneeId = this.context.userId;
      return filters;
    }

    return filters;
  }
}

export default TasksQueryBuilder;

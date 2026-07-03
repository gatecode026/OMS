import mongoose from 'mongoose';

/**
 * Leave Query Builder responsible for translating the generic security context 
 * into Leave-specific MongoDB query criteria.
 */
export class LeaveQueryBuilder {
  constructor(securityContext) {
    this.context = securityContext;
  }

  /**
   * Builds the MongoDB query filters for reading Leave requests.
   * @param {Object} incomingQuery - Client-supplied query params
   */
  async buildReadQuery(incomingQuery = {}) {
    const filters = { ...incomingQuery };

    // Separate path: Policies do not get employee branch/dept/ownership filters applied.
    // They are handled by validatePolicyAccess separately.
    if (filters.isPolicy === true || (incomingQuery.isPolicy && incomingQuery.isPolicy.toString() === 'true')) {
      return filters;
    }

    // Default: Exclude policies when querying normal leaves
    if (filters.isPolicy === undefined) {
      filters.isPolicy = { $ne: true };
    }

    if (!this.context) return filters;
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters; // Company Admin needs no extra scope beyond tenant connection isolation
    }

    // Branch Admin / Branch Manager: Scoped by Branch.
    // NOTE: Leave schema does NOT contain 'branch' field. We must resolve branch employee IDs.
    if (this.context.isBranchAdmin || this.context.isManager) {
      if (this.context.branch) {
        const Employee = mongoose.model('Employee');
        const branchEmps = await Employee.find({ branch: this.context.branch }).select('id').lean();
        const branchEmployeeIds = branchEmps.map(e => e.id);
        filters.employeeId = { $in: branchEmployeeIds };
      }
    }

    // Department Manager: Scoped by Department (Leave schema has 'department').
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      if (this.context.department) {
        filters.department = this.context.department;
      }
    }

    // Team Leader: Scoped by their assigned team members (cached on authentication) plus their own
    if (this.context.isTeamLeader) {
      const teamEmployeeIds = this.context.teamEmployeeIds || [];
      const allowedIds = [...teamEmployeeIds, this.context.userId];
      if (incomingQuery.employeeId) {
        if (allowedIds.includes(incomingQuery.employeeId)) {
          filters.employeeId = incomingQuery.employeeId;
        } else {
          filters.employeeId = 'UNAUTHORIZED';
        }
      } else {
        filters.employeeId = { $in: allowedIds };
      }
    }

    // Standard employee: Scoped by own ID
    if (this.context.isEmployee) {
      filters.employeeId = this.context.userId;
    }

    return filters;
  }

  /**
   * Builds the MongoDB query filters for updating/deleting Leave requests.
   * @param {String} id - Target Leave document ID
   */
  async buildWriteQuery(id) {
    const filters = { id, isPolicy: { $ne: true } };

    if (!this.context) return filters;
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    if (this.context.isBranchAdmin || this.context.isManager) {
      if (this.context.branch) {
        const Employee = mongoose.model('Employee');
        const branchEmps = await Employee.find({ branch: this.context.branch }).select('id').lean();
        const branchEmployeeIds = branchEmps.map(e => e.id);
        filters.employeeId = { $in: branchEmployeeIds };
      }
    }

    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      if (this.context.department) {
        filters.department = this.context.department;
      }
    }

    if (this.context.isTeamLeader) {
      const teamEmployeeIds = this.context.teamEmployeeIds || [];
      const allowedIds = [...teamEmployeeIds, this.context.userId];
      filters.employeeId = { $in: allowedIds };
    }

    if (this.context.isEmployee) {
      filters.employeeId = this.context.userId;
    }

    return filters;
  }
}

export default LeaveQueryBuilder;

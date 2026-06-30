/**
 * Attendance Query Builder responsible for translating the generic security context 
 * into Attendance-specific MongoDB query criteria.
 */
export class AttendanceQueryBuilder {
  constructor(securityContext) {
    this.context = securityContext;
  }

  /**
   * Builds the MongoDB query filters for reading Attendance records.
   * @param {Object} incomingQuery - Client-supplied query params
   */
  buildReadQuery(incomingQuery = {}) {
    const filters = { ...incomingQuery };

    if (!this.context) return filters;
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters; // Company Admin needs no extra scope beyond tenant connection isolation
    }

    // Branch Admin / Branch Manager see attendance in their branch
    if (this.context.isBranchAdmin || this.context.isManager) {
      if (this.context.branch) {
        filters.branch = this.context.branch;
      }
    }

    // Department Manager sees attendance in their department
    // In our system, Department Managers might have isManager = true, but let's check department field:
    // If a Department Manager is scoped to their department, apply it:
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      if (this.context.department) {
        filters.department = this.context.department;
      }
      if (this.context.branch) {
        filters.branch = this.context.branch;
      }
    }

    // Team Leader sees only members of their assigned team
    if (this.context.isTeamLeader) {
      const teamEmployeeIds = this.context.teamEmployeeIds || [];
      filters.employeeId = { $in: teamEmployeeIds };
    }

    // Standard employee can only see their own attendance logs
    if (this.context.isEmployee) {
      filters.employeeId = this.context.userId;
    }

    return filters;
  }

  /**
   * Builds the MongoDB query filters for updating/deleting Attendance records.
   * @param {String} id - Target Attendance document ID
   */
  buildWriteQuery(id) {
    const filters = { id };

    if (!this.context) return filters;
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    if (this.context.isBranchAdmin || this.context.isManager) {
      if (this.context.branch) {
        filters.branch = this.context.branch;
      }
    }

    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      if (this.context.department) {
        filters.department = this.context.department;
      }
    }

    if (this.context.isTeamLeader) {
      const teamEmployeeIds = this.context.teamEmployeeIds || [];
      filters.employeeId = { $in: teamEmployeeIds };
    }

    if (this.context.isEmployee) {
      filters.employeeId = this.context.userId;
    }

    return filters;
  }
}

export default AttendanceQueryBuilder;

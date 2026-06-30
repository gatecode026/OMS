/**
 * Employee Query Builder responsible for translating the generic security context 
 * into Employee-specific MongoDB query criteria.
 */
export class EmployeeQueryBuilder {
  constructor(securityContext) {
    this.context = securityContext;
  }

  /**
   * Builds the MongoDB query filters for reading Employee documents.
   * @param {Object} incomingQuery - Client-supplied query params
   */
  buildReadQuery(incomingQuery = {}) {
    const filters = { ...incomingQuery };

    if (!this.context) return filters;
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    // Branch Admin / Team Leader / Manager see employees in their branch
    if (this.context.isBranchAdmin || this.context.isTeamLeader || this.context.isManager) {
      if (this.context.branch) {
        filters.branch = this.context.branch;
      }
    }

    // Employee sees employees in their department (cannot access other departments)
    if (this.context.isEmployee) {
      if (this.context.branch) {
        filters.branch = this.context.branch;
      }
      if (this.context.department) {
        filters.department = this.context.department;
      }
    }

    return filters;
  }

  /**
   * Builds the MongoDB query filters for updating Employee documents.
   * @param {String} id - Target Employee business ID
   */
  buildUpdateQuery(id) {
    const filters = { id };

    if (!this.context) return filters;
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    // Branch Admin / Team Leader / Manager can only update employees in their branch
    if (this.context.isBranchAdmin || this.context.isTeamLeader || this.context.isManager) {
      if (this.context.branch) {
        filters.branch = this.context.branch;
      }
    }

    // Standard employee can only update their own record
    if (this.context.isEmployee) {
      filters.id = this.context.userId;
    }

    return filters;
  }

  /**
   * Builds the MongoDB query filters for deleting Employee documents.
   * @param {String} id - Target Employee business ID
   */
  buildDeleteQuery(id) {
    const filters = { id };

    if (!this.context) return filters;
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    // Branch Admin / Team Leader / Manager can only delete employees in their branch
    if (this.context.isBranchAdmin || this.context.isTeamLeader || this.context.isManager) {
      if (this.context.branch) {
        filters.branch = this.context.branch;
      }
    }

    // Standard employee can only delete their own record
    if (this.context.isEmployee) {
      filters.id = this.context.userId;
    }

    return filters;
  }

  /**
   * Builds the MongoDB query filters for validating ownership of Employee documents.
   * @param {String} id - Target Employee ID
   */
  buildOwnershipQuery(id) {
    return { id, id: this.context ? this.context.userId : null };
  }
}

export default EmployeeQueryBuilder;

/**
 * Role Authority Levels mapping for dynamic RBAC queries.
 */
export const ROLE_AUTHORITY_RANKS = {
  super_admin: 100,
  superadmin: 100,
  company_admin: 100,
  companyadmin: 100,
  branch_admin: 60,
  branchadmin: 60,
  manager: 50,
  branch_manager: 50,
  hr_manager: 50,
  finance_manager: 50,
  dept_admin: 50,
  project_manager: 50,
  team_leader: 30,
  employee: 10
};

export const getRoleAuthorityRank = (roleId) => {
  if (!roleId) return 10;
  const normalized = String(roleId).toLowerCase().trim();
  return ROLE_AUTHORITY_RANKS[normalized] || 10;
};

export const getHigherAuthorityRoles = (userRole) => {
  const userRank = getRoleAuthorityRank(userRole);
  return Object.keys(ROLE_AUTHORITY_RANKS).filter(role => ROLE_AUTHORITY_RANKS[role] > userRank);
};

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

    const currentUserId = this.context.userId || this.context.employeeId;
    const userRole = this.context.role || 'employee';
    const scopeFilter = {};

    // Branch Admin / Manager see employees in their branch
    if (this.context.isBranchAdmin || this.context.isManager) {
      if (this.context.branch) {
        scopeFilter.branch = this.context.branch;
      }
      // Dynamically exclude top platform-level admins above branch/manager level
      const higherRoles = getHigherAuthorityRoles(userRole);
      if (higherRoles.length > 0) {
        scopeFilter.roleId = { $nin: higherRoles };
      }
    } else if (this.context.isTeamLeader) {
      if (this.context.branch) {
        scopeFilter.branch = this.context.branch;
      }
      // Dynamically exclude roles with higher authority than team leader
      const higherRoles = getHigherAuthorityRoles(userRole);
      if (higherRoles.length > 0) {
        scopeFilter.roleId = { $nin: higherRoles };
      }
    } else if (this.context.isEmployee) {
      if (this.context.branch) {
        scopeFilter.branch = this.context.branch;
      }
      if (this.context.department) {
        scopeFilter.department = this.context.department;
      }
      // Dynamically exclude roles with higher authority than standard employee
      const higherRoles = getHigherAuthorityRoles(userRole);
      if (higherRoles.length > 0) {
        scopeFilter.roleId = { $nin: higherRoles };
      }
    }

    // Always ensure logged-in user can see their own profile (self-access override)
    if (currentUserId) {
      filters.$or = [
        { id: currentUserId },
        scopeFilter
      ];
    } else {
      Object.assign(filters, scopeFilter);
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

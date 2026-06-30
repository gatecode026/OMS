import { getCurrentUser, getStore } from '../utils/tenantContext.js';
import logger from '../config/logger.js';

/**
 * Reusable Scope Engine resolving the authenticated user's security context.
 * This engine remains independent of database schemas and repository-specific queries.
 * Evaluates the context once per request and caches it on the ALS store.
 */
export const resolveSecurityContext = () => {
  const store = getStore();
  if (!store) {
    logger.warn('ScopeEngine::resolveSecurityContext - No AsyncLocalStorage store found');
    return null;
  }

  // Reuse cached context if already resolved for this request
  if (store.securityContext) {
    return store.securityContext;
  }

  const user = store.user;
  if (!user) {
    logger.warn('ScopeEngine::resolveSecurityContext - No user found in context store');
    return null;
  }

  const role = (user.role || '').toLowerCase();

  const isSuperAdmin = ['super_admin', 'superadmin'].includes(role);
  const isCompanyAdmin = ['company_admin', 'companyadmin'].includes(role);
  const isBranchAdmin = ['branch_admin', 'branchadmin'].includes(role);
  const isManager = ['manager', 'dept_admin', 'project_manager'].includes(role);
  const isTeamLeader = role === 'team_leader';
  const isEmployee = role === 'employee';

  let permissionLevel = 'employee';
  if (isSuperAdmin) permissionLevel = 'super_admin';
  else if (isCompanyAdmin) permissionLevel = 'company_admin';
  else if (isBranchAdmin) permissionLevel = 'branch_admin';
  else if (isManager) permissionLevel = 'manager';
  else if (isTeamLeader) permissionLevel = 'team_leader';

  const securityContext = {
    userId: user.id,
    employeeId: user.id,
    companyId: user.companyId,
    role: role,
    branch: user.branch || null,
    department: user.department || null,
    team: user.team || null,
    teamEmployeeIds: user.teamEmployeeIds || [],
    permissionLevel,
    isSuperAdmin,
    isCompanyAdmin,
    isBranchAdmin,
    isManager,
    isTeamLeader,
    isEmployee
  };

  // Cache the resolved context back on the store for the remainder of request lifecycle
  store.securityContext = securityContext;

  return securityContext;
};

export default {
  resolveSecurityContext
};

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  BRANCH_ADMIN: 'branch_admin',
  MANAGER: 'manager',
  TEAM_LEADER: 'team_leader',
  EMPLOYEE: 'employee',
  HR: 'hr'
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.BRANCH_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.EMPLOYEE, ROLES.HR],
  [ROLES.COMPANY_ADMIN]: [ROLES.COMPANY_ADMIN, ROLES.BRANCH_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.EMPLOYEE, ROLES.HR],
  [ROLES.BRANCH_ADMIN]: [ROLES.BRANCH_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.EMPLOYEE, ROLES.HR],
  [ROLES.MANAGER]: [ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.TEAM_LEADER]: [ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.EMPLOYEE]: [ROLES.EMPLOYEE],
  [ROLES.HR]: [ROLES.HR, ROLES.EMPLOYEE]
};

export const getBaseRole = (role) => {
  if (!role) return '';
  const knownRoles = ['super_admin', 'company_admin', 'branch_admin', 'manager', 'team_leader', 'employee', 'hr'];
  for (const known of knownRoles) {
    if (role === known || role.endsWith('_' + known)) {
      return known;
    }
  }
  const parts = role.split('_');
  if (parts.length > 1) {
    return parts.slice(1).join('_');
  }
  return role;
};

export const hasRoleAccess = (userRole, requiredRole) => {
  if (!userRole) return false;
  if (!requiredRole) return true;
  
  const baseUserRole = getBaseRole(userRole);
  const baseRequiredRole = getBaseRole(requiredRole);
  
  if (baseUserRole === ROLES.SUPER_ADMIN) return true;
  
  const inheritedRoles = ROLE_HIERARCHY[baseUserRole] || ROLE_HIERARCHY[userRole] || [];
  return inheritedRoles.includes(baseRequiredRole);
};


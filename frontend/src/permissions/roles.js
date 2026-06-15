export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  BRANCH_ADMIN: 'branch_admin',
  MANAGER: 'manager',
  TEAM_LEADER: 'team_leader',
  EMPLOYEE: 'employee'
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.BRANCH_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.COMPANY_ADMIN]: [ROLES.COMPANY_ADMIN, ROLES.BRANCH_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.BRANCH_ADMIN]: [ROLES.BRANCH_ADMIN, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.MANAGER]: [ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.TEAM_LEADER]: [ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.EMPLOYEE]: [ROLES.EMPLOYEE]
};
export const hasRoleAccess = (userRole, requiredRole) => {
  if (!userRole) return false;
  if (!requiredRole) return true;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
  return inheritedRoles.includes(requiredRole);
};

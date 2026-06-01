export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BRANCH_ADMIN: 'branch_admin',
  TEAM_LEADER: 'team_leader',
  EMPLOYEE: 'employee'
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN, ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.BRANCH_ADMIN]: [ROLES.BRANCH_ADMIN, ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.TEAM_LEADER]: [ROLES.TEAM_LEADER, ROLES.EMPLOYEE],
  [ROLES.EMPLOYEE]: [ROLES.EMPLOYEE]
};

/**
 * Checks if a user's role satisfies the required role.
 * e.g., if requiredRole is TEAM_LEADER, then TEAM_LEADER, BRANCH_ADMIN, and SUPER_ADMIN have access.
 */
export const hasRoleAccess = (userRole, requiredRole) => {
  if (!userRole) return false;
  if (!requiredRole) return true; // No specific role required
  const allowedRoles = ROLE_HIERARCHY[requiredRole] || [requiredRole];
  // Wait, if the user role is higher than or equal to requiredRole:
  // e.g. if requiredRole is employee: ROLE_HIERARCHY[employee] has employee.
  // Wait, the hierarchy flows: super_admin has everything.
  // Let's do a direct look up: does the user's role list of inherited roles include requiredRole?
  // Let's implement it clearly:
  if (userRole === ROLES.SUPER_ADMIN) return true;
  const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
  return inheritedRoles.includes(requiredRole);
};

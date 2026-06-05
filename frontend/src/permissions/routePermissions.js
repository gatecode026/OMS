import { ROLES } from './roles';

/**
 * Route-to-Role Mapping
 * Maps each route path to the minimum required role level.
 */
export const ROUTE_PERMISSIONS = {
  // Super Admin Only
  '/permissions': ROLES.SUPER_ADMIN,
  '/activity-logs': ROLES.SUPER_ADMIN,
  '/security': ROLES.SUPER_ADMIN,
  '/audit-logs': ROLES.SUPER_ADMIN,
  '/reports': ROLES.SUPER_ADMIN,
  '/settings': ROLES.SUPER_ADMIN,

  // Branch Admin and above
  '/employees': ROLES.BRANCH_ADMIN,
  '/employees/add': ROLES.BRANCH_ADMIN,
  '/employees/:id': ROLES.BRANCH_ADMIN,
  '/attendance': ROLES.BRANCH_ADMIN,
  '/departments': ROLES.BRANCH_ADMIN,
  '/branches': ROLES.BRANCH_ADMIN,
  '/teams': ROLES.BRANCH_ADMIN,
  '/managers': ROLES.MANAGER,
  '/teams/leaders': ROLES.TEAM_LEADER,
  '/payroll': ROLES.EMPLOYEE,

  // Team Leader and above
  '/leaves': ROLES.TEAM_LEADER,
  '/projects': ROLES.TEAM_LEADER,
  '/workflows': ROLES.TEAM_LEADER,
  '/tasks': ROLES.TEAM_LEADER,
  '/work-reports': ROLES.TEAM_LEADER,
  '/performance': ROLES.TEAM_LEADER,

  // Employee and above (General Access)
  '/': ROLES.EMPLOYEE,
  '/overview': ROLES.EMPLOYEE,
  '/announcements': ROLES.EMPLOYEE,
  '/notifications': ROLES.EMPLOYEE,
  '/documents': ROLES.EMPLOYEE,
  '/profile': ROLES.EMPLOYEE,
  '/unauthorized': ROLES.EMPLOYEE
};
export const getRequiredRoleForPath = (path) => {
  // Normalize path
  if (!path) return ROLES.EMPLOYEE;
  
  // Exact match
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path];
  }

  // Parameterized match (e.g. /employees/:id)
  const pathParts = path.split('/').filter(Boolean);
  
  for (const route of Object.keys(ROUTE_PERMISSIONS)) {
    const routeParts = route.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;
    
    let match = true;
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        // Dynamic param, matches anything in this segment
        continue;
      }
      if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }
    
    if (match) {
      return ROUTE_PERMISSIONS[route];
    }
  }

  // Fallback to employee
  return ROLES.EMPLOYEE;
};

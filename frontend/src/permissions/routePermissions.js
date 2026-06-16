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
  '/settings': ROLES.COMPANY_ADMIN,

  // Branch Admin and above
  '/employees': ROLES.BRANCH_ADMIN,
  '/employees/add': ROLES.BRANCH_ADMIN,
  '/employees/:id': ROLES.BRANCH_ADMIN,
  '/attendance': ROLES.EMPLOYEE,
  '/departments': ROLES.BRANCH_ADMIN,
  '/branches': ROLES.BRANCH_ADMIN,
  '/teams': ROLES.BRANCH_ADMIN,
  '/managers': ROLES.MANAGER,
  '/teams/leaders': ROLES.TEAM_LEADER,
  '/payroll': ROLES.EMPLOYEE,

  // Team Leader and above
  '/leaves': ROLES.EMPLOYEE,
  '/projects': ROLES.EMPLOYEE,
  '/tasks': ROLES.EMPLOYEE,
  '/work-reports': ROLES.EMPLOYEE,
  '/performance': ROLES.TEAM_LEADER,
  '/calendar': ROLES.EMPLOYEE,

  // Employee and above (General Access)
  '/employee-dashboard': ROLES.EMPLOYEE,
  '/': ROLES.EMPLOYEE,
  '/announcements': ROLES.EMPLOYEE,
  '/notifications': ROLES.EMPLOYEE,
  '/documents': ROLES.EMPLOYEE,
  '/profile': ROLES.EMPLOYEE,
  '/my-profile': ROLES.EMPLOYEE,
  '/employee-profile/:id': ROLES.EMPLOYEE,
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

/**
 * Route-to-Permission Matrix Module Mapping
 * Maps each route path to its corresponding granular matrix module key.
 */
export const PATH_TO_MODULE = {
  '/': 'dashboard',
  '/employee-dashboard': 'dashboard',
  '/overview': 'company_overview',
  '/employees': 'employee_management',
  '/employees/add': 'employee_management',
  '/employees/:id': 'employee_management',
  '/employee-profile/:id': 'employee_management',
  '/branches': 'agency_branch_management',
  '/departments': 'department_management',
  '/teams': 'team_management',
  '/managers': 'team_management',
  '/teams/leaders': 'team_management',
  '/attendance': 'attendance_management',
  '/attendance/webportal': 'attendance_management',
  '/leaves': 'leave_management',
  '/projects': 'project_management',
  '/tasks': 'task_monitoring',
  '/work-reports': 'work_reports',
  '/performance': 'performance_analytics',
  '/payroll': 'payroll_management',
  '/announcements': 'announcements',
  '/notifications': 'notifications',
  '/documents': 'document_management',
  '/permissions': 'role_permission',
  '/settings': 'system_settings',
  '/security': 'security_audit_logs',
  '/audit-logs': 'security_audit_logs',
  '/reports': 'security_audit_logs',
  '/my-profile': 'profile_settings',
  '/profile': 'profile_settings'
};



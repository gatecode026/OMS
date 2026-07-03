/**
 * @file src/config/roleMatrix.js
 * @description Centralized Role-Permission configuration matrix.
 */

export const roleMatrix = {
  super_admin: {
    allowedRoutes: [
      '/api/admin/*', '/api/auth/*',
      '/api/v1/companies/*', '/api/v1/admin/*', '/api/v1/auth/*',
      '/api/v1/roles/*', '/api/v1/chat/*', '/api/v1/appraisal-reviews/*'
    ],
    blockedRoutes: [
      '/api/employees/*', '/api/tasks/*', '/api/attendance/*', 
      '/api/leaves/*', '/api/payroll/*', '/api/projects/*', 
      '/api/performance/*', '/api/security/*', '/api/settings/*',
      '/api/branches/*', '/api/teams/*', '/api/departments/*',
      '/api/workflows/*', '/api/announcements/*', '/api/events/*',
      '/api/v1/employees/*', '/api/v1/tasks/*', '/api/v1/attendance/*', 
      '/api/v1/leaves/*', '/api/v1/payroll/*', '/api/v1/projects/*', 
      '/api/v1/performance/*', '/api/v1/security/*', '/api/v1/settings/*',
      '/api/v1/branches/*', '/api/v1/teams/*', '/api/v1/departments/*',
      '/api/v1/workflows/*', '/api/v1/announcements/*', '/api/v1/events/*'
    ]
  },
  company_admin: {
    allowedRoutes: ['/api/*', '/api/v1/*'],
    blockedRoutes: [
      '/api/admin/*', '/api/v1/admin/*'
    ]
  }
};

export default roleMatrix;

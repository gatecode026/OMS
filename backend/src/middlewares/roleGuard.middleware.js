/**
 * @file src/middlewares/roleGuard.middleware.js
 * @description Role Guard middleware validating request paths against the centralized role permission matrix.
 */

import { roleMatrix } from '../config/roleMatrix.js';
import logger from '../config/logger.js';

/**
 * Converts wildcard glob patterns (e.g. /api/employees/*) into regex and checks for matching route paths.
 * @param {string} pattern - Glob pattern.
 * @param {string} path - Request path.
 * @returns {boolean} True if path matches the pattern.
 */
const matchPattern = (pattern, path) => {
  let regexPattern;
  if (pattern.endsWith('/*')) {
    const basePath = pattern.slice(0, -2);
    const escaped = basePath.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    regexPattern = '^' + escaped + '(\\/.*)?$';
  } else {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    regexPattern = '^' + escaped.replace(/\*/g, '.*') + '$';
  }
  return new RegExp(regexPattern, 'i').test(path);
};

/**
 * Generic middleware checking route permissions based on req.user.role
 */
export const checkRoleAccess = (req, res, next) => {
  const user = req.user;
  if (!user) {
    // If not authenticated yet, let downstream authentication handle it
    return next();
  }

  const role = user.role;
  const rawPath = req.originalUrl || req.path || req.url || '';
  const path = rawPath.split('?')[0];

  // Normalize role input to match roleMatrix keys
  const getRoleRules = (r) => {
    if (!r) return null;
    const normalized = r.toLowerCase().replace(/[\s_-]/g, '');
    if (normalized === 'superadmin') return roleMatrix.super_admin;
    if (normalized === 'companyadmin') return roleMatrix.company_admin;
    return roleMatrix[r] || roleMatrix[normalized];
  };

  const rules = getRoleRules(role);
  if (!rules) {
    // If no rules mapped for this role, pass downstream (unchanged roles like Manager/Employee)
    return next();
  }

  // 1. Check blocked routes
  if (rules.blockedRoutes) {
    for (const pattern of rules.blockedRoutes) {
      if (matchPattern(pattern, path)) {
        logger.warn(`roleGuard::checkRoleAccess [BLOCKED] User "${user.name}" (Role: ${role}) tried to access "${path}" which matches blocked pattern "${pattern}"`);
        return res.status(403).json({
          status: 'fail',
          message: `Access denied: Role "${role}" is not authorized to access this resource.`
        });
      }
    }
  }

  // 2. Check allowed routes
  if (rules.allowedRoutes) {
    let isAllowed = false;
    for (const pattern of rules.allowedRoutes) {
      if (matchPattern(pattern, path)) {
        isAllowed = true;
        break;
      }
    }
    if (!isAllowed) {
      logger.warn(`roleGuard::checkRoleAccess [NOT ALLOWED] User "${user.name}" (Role: ${role}) tried to access "${path}" which is not in allowed patterns`);
      return res.status(403).json({
        status: 'fail',
        message: `Access denied: Role "${role}" is not authorized to access this resource.`
      });
    }
  }

  next();
};

export default checkRoleAccess;

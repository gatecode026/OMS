/**
 * @file src/middlewares/auth.middleware.js
 * @description Standard Authentication & Authorization (RBAC) middleware triggers.
 */

import logger from '../config/logger.js';

/**
 * Validates JWT access token stored in Authorization header.
 * Simulates check for 'saas_token' matching the UI sessionStorage key.
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. Missing or invalid Authorization token.',
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Placeholder JWT decoding:
    /*
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    */
    
    // Simulated decoded user session context
    req.user = {
      id: 'EMP-2026-001',
      name: 'Aarav Sharma',
      email: 'admin@saas.com',
      role: 'super_admin', // matches highest level role
    };

    logger.debug(`User authenticated successfully: ${req.user.name} (${req.user.role})`);
    next();
  } catch (error) {
    logger.error('Authentication Error:', error);
    return res.status(401).json({
      status: 'fail',
      message: 'Authentication failed. Expired or malformed session token.',
    });
  }
};

/**
 * Restricts access to specific roles. Simulates UI RoleGuard mapping.
 * @param {Array<string>} allowedRoles - Permitted roles (e.g. ['super_admin', 'branch_admin'])
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // Standard role access guard check
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn(`Access forbidden for user: ${req.user?.name}. Role: ${req.user?.role}. Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        status: 'fail',
        message: 'Access forbidden. You do not possess the required system permissions to access this domain.',
      });
    }
    next();
  };
};

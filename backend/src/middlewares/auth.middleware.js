/**
 * @file src/middlewares/auth.middleware.js
 * @description Authentication & Authorization (RBAC) middleware verifying real JWT tokens.
 */

import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import Admin from '../modules/admin/admin.model.js';
import Employee from '../modules/employees/employees.model.js';
import Company from '../modules/companies/company.model.js';
import logger from '../config/logger.js';
import { isDatabaseConnected } from '../config/database.js';
import { runWithTenant } from '../utils/tenantContext.js';

/**
 * Validates JWT access token stored in Authorization header.
 * Attaches validated database user session context to request payload.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. Missing or invalid Authorization token.',
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Check if token has been blacklisted/revoked
    const { isTokenBlacklisted } = await import('../services/security.service.js');
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. This session has been revoked.',
      });
    }

    // Decode token
    const decoded = jwt.verify(token, env.jwtSecret);
    
    // In offline sandbox mode, use the token payload directly
    if (!isDatabaseConnected) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        companyId: decoded.companyId || 'COMP-DEFAULT',
        name: decoded.name || 'Offline User',
        branch: decoded.branch || null,
        department: decoded.department || null,
        team: decoded.team || null
      };
      logger.debug(`User authenticated offline successfully: ${req.user.name} (${req.user.role})`);
      return await runWithTenant(req.user.companyId, next, false, req.user);
    }

    // Retrieve associated active account from matching collection
    let user;
    if (decoded.role === 'super_admin') {
      user = await Admin.findOne({ id: decoded.id }).select('id name email roleId status companyId').lean();
    } else if (decoded.role === 'company_admin') {
      user = await Company.findOne({ id: decoded.id }).select('id name email status').lean();
      if (user) {
        user.roleId = 'company_admin';
        user.companyId = user.id;
      }
    } else {
      // For employees, resolve the correct database connection before querying the model
      const companyId = decoded.companyId || 'COMP-DEFAULT';
      user = await runWithTenant(companyId, async () => {
        const emp = await Employee.findOne({ id: decoded.id }).select('id name email roleId status companyId branch department team').lean();
        if (emp && emp.roleId === 'team_leader') {
          const teamEmps = await Employee.find({
            $or: [
              { team: emp.team },
              { teamLeader: emp.id },
              { teamLeader: emp.name }
            ]
          }).select('id').lean();
          const teamEmployeeIds = teamEmps.map(e => e.id);
          if (!teamEmployeeIds.includes(emp.id)) {
            teamEmployeeIds.push(emp.id);
          }
          emp.teamEmployeeIds = teamEmployeeIds;
        }
        return emp;
      });
    }

    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. The session user was not found.',
      });
    }

    if (user.status !== 'Active' && user.status !== 'On Leave') {
      return res.status(403).json({
        status: 'fail',
        message: 'Authentication failed. This account is inactive.',
      });
    }

    // Attach user profile context
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleId,
      companyId: user.companyId || 'COMP-DEFAULT',
      branch: user.branch,
      department: user.department,
      team: user.team,
      teamEmployeeIds: user.teamEmployeeIds || []
    };

    const isSuperAdmin = user.roleId === 'super_admin';
    logger.debug(`User authenticated successfully: ${req.user.name} (${req.user.role})`);
    await runWithTenant(req.user.companyId, next, isSuperAdmin, req.user);
  } catch (error) {
    logger.error('Authentication Middleware Error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. Expired or malformed session token.',
      });
    }
    next(error);
  }
};

/**
 * Restricts access to specific roles. Simulates UI RoleGuard mapping.
 * @param {Array<string>} allowedRoles - Permitted roles (e.g. ['super_admin', 'branch_admin'])
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
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

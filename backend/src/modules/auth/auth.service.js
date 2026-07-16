/**
 * @file src/modules/auth/auth.service.js
 * @description Authentication Service looking up Super Admin accounts in the dedicated Admin collection.
 */

import jwt from 'jsonwebtoken';
import Admin from '../admin/admin.model.js';
import Employee from '../employees/employees.model.js';
import Company from '../companies/company.model.js';
import { UserSession, EmployeeLockout } from '../security/security.model.js';
import env from '../../config/env.js';
import logger from '../../config/logger.js';
import mongoose from 'mongoose';

/**
 * Handles credentials authentication, validates active accounts, and issues signed JWTs.
 * Supporting live Mongoose connections (with super_admin residing in dedicated admins collection).
 * 
 * @param {string} email - User input email.
 * @param {string} password - User input plain password.
 * @param {Object} [options] - Additional parameters for resolving tenant.
 * @param {string} [options.companyCode] - Optional company code or subdomain passed in request.
 * @param {string} [options.subdomain] - Optional subdomain resolved from request host.
 * @returns {Promise<{user: Object, token: string}>} The user payload and valid session token.
 */
export const login = async (email, password, options = {}) => {
  const { companyCode, subdomain } = options;

  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    err.status = 'fail';
    throw err;
  }

  // Normalize input email
  const resolvedEmail = email.toLowerCase().trim();

  console.log(`[DEBUG login] Email received: "${email}" | Password length: ${password ? password.length : 0} | Resolved Email: "${resolvedEmail}" | Company Code: "${companyCode}" | Subdomain: "${subdomain}"`);

  if (mongoose.connection.readyState !== 1) {
    logger.error('AuthService::login [Error] Database is not connected');
    const err = new Error('Database connection is offline. Please try again later.');
    err.statusCode = 500;
    err.status = 'error';
    throw err;
  }

  logger.info(`AuthService::login [Database Mode] Verifying credentials for: ${resolvedEmail}`);

  const prefix = resolvedEmail.split('@')[0];
  const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

  // Resolve company via tenant registry lookup first, falling back to subdomain / companyCode parameters
  const { getTenantIdByEmail } = await import('../../utils/tenantRegistry.js');
  const registryCompanyId = await getTenantIdByEmail(resolvedEmail);

  let resolvedCompany = null;
  if (registryCompanyId) {
    resolvedCompany = await Company.findOne({ id: registryCompanyId });
  } else if (companyCode) {
    resolvedCompany = await Company.findOne({
      $or: [
        { id: companyCode.toUpperCase().trim() },
        { subdomain: companyCode.toLowerCase().trim() }
      ]
    });
  } else if (subdomain && !['www', 'localhost', 'app', 'admin'].includes(subdomain.toLowerCase().trim())) {
    resolvedCompany = await Company.findOne({
      subdomain: subdomain.toLowerCase().trim()
    });
  }

  const isFullEmail = resolvedEmail.includes('@');

  // Fetch account from the dedicated Super Admin collection
  let user = await Admin.findOne(
    isFullEmail
      ? { email: resolvedEmail }
      : {
          $or: [
            { email: new RegExp('^' + escapedPrefix + '(@|.*)', 'i') },
            { name: new RegExp('^' + escapedPrefix + '($|\\s)', 'i') }
          ]
        }
  ).select('+password');

  let isEmployee = false;
  let isCompanyAdmin = false;

  if (!user && resolvedCompany) {
    if (resolvedCompany.databaseType === 'dedicated') {
      // Query dedicated database connection using runWithTenant
      const { runWithTenant } = await import('../../utils/tenantContext.js');
      await runWithTenant(resolvedCompany.id, async () => {
        if (isFullEmail) {
          user = await Employee.findOne({ email: resolvedEmail }).select('+password');
        } else {
          user = await Employee.findOne({
            $or: [
              { username: prefix },
              { email: new RegExp('^' + escapedPrefix + '(@|.*)', 'i') },
              { name: new RegExp('^' + escapedPrefix + '($|\\s)', 'i') }
            ]
          }).select('+password');
        }
      });
      if (user) {
        if (user.roleId === 'company_admin') {
          isCompanyAdmin = true;
        } else {
          isEmployee = true;
        }
      }
    } else {
      // Shared database flow
      if (isFullEmail) {
        user = await Employee.findOne({ email: resolvedEmail, companyId: resolvedCompany.id }).select('+password');
      } else {
        user = await Employee.findOne({
          $or: [
            { username: prefix },
            { email: new RegExp('^' + escapedPrefix + '(@|.*)', 'i') },
            { name: new RegExp('^' + escapedPrefix + '($|\\s)', 'i') }
          ],
          companyId: resolvedCompany.id
        }).select('+password');
      }
      if (user) {
        isEmployee = true;
      }
    }
  }

  // Fallback to Company Admin login lookup (for backward compatibility on shared databases)
  if (!user) {
    if (resolvedCompany && resolvedCompany.email === resolvedEmail) {
      user = await Company.findOne({ id: resolvedCompany.id }).select('+password');
      if (user) {
        isCompanyAdmin = true;
      }
    } else {
      user = await Company.findOne({ email: resolvedEmail }).select('+password');
      if (user) {
        isCompanyAdmin = true;
      }
    }
  }

  if (!user) {
    logger.warn(`AuthService::login record not found for: ${resolvedEmail}`);
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.status = 'fail';
    throw err;
  }

  // Verify company status first if user is an employee
  if (isEmployee && user.companyId) {
    const userCompany = await Company.findOne({ id: user.companyId });
    if (userCompany && userCompany.status === 'Suspended') {
      logger.warn(`AuthService::login block attempt for user ${resolvedEmail} under suspended company ${user.companyId}`);
      const err = new Error("Your organization's access has been suspended");
      err.statusCode = 403;
      err.status = 'fail';
      throw err;
    }
  }

  const accountStatus = isEmployee ? user.accountStatus : user.status;
  if (accountStatus !== 'Active') {
    logger.warn(`AuthService::login block attempt for inactive account ${resolvedEmail} (accountStatus: ${accountStatus})`);
    const err = new Error('Your account has been deactivated. Please contact your system administrator.');
    err.statusCode = 403;
    err.status = 'fail';
    throw err;
  }

  // Check for active admin force-logout lockout
  if (isEmployee) {
    const activeLockout = await EmployeeLockout.findOne({
      employeeId: user.id,
      lockedUntil: { $gt: new Date() }
    });

    if (activeLockout) {
      const remainingMs = new Date(activeLockout.lockedUntil).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / (60 * 1000));
      logger.warn(`AuthService::login block attempt for locked out user ${resolvedEmail} until ${activeLockout.lockedUntil}`);
      const err = new Error(`Your account has been temporarily locked by an administrator. Please try again in ${remainingMin} minute(s).`);
      err.statusCode = 403;
      err.status = 'fail';
      throw err;
    }
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    logger.warn(`AuthService::login credentials failed for: ${resolvedEmail}`);
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.status = 'fail';
    throw err;
  }

  // Update lastLoginAt for Employee
  if (isEmployee) {
    await Employee.updateOne({ id: user.id }, { $set: { lastLoginAt: new Date() } });
  }

  const token = jwt.sign(
    { 
      id: isCompanyAdmin ? (user.companyId || user.id) : user.id, 
      email: user.email, 
      role: isCompanyAdmin ? 'company_admin' : user.roleId, 
      roleId: isCompanyAdmin ? 'company_admin' : user.roleId,
      companyId: isCompanyAdmin ? (user.companyId || user.id) : (user.companyId || null) 
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  const userResponse = user.toObject();
  delete userResponse.password;

  if (isCompanyAdmin) {
    userResponse.role = 'CompanyAdmin';
    userResponse.roleId = 'company_admin';
    userResponse.companyId = user.companyId || user.id;
  }

  logger.info(`AuthService::login success for: ${user.name} (${isCompanyAdmin ? 'company_admin' : user.roleId})`);

  // --- Record active session in security.UserSession ---
  try {
    const sessionId = `SES-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const ip = options.ip || '—';
    const ua = options.userAgent || '';

    // Resolve the companyId for tenant scoping
    const sessionCompanyId = isCompanyAdmin
      ? (user.companyId || user.id)
      : (user.companyId || resolvedCompany?.id || null);

    if (!sessionCompanyId) {
      logger.warn(`AuthService::login session skipped — no companyId resolved for ${user.name}`);
    } else {
      // Simple UA parsing
      let browser = 'Unknown';
      let os = 'Unknown';
      if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Safari')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
      const deviceType = ua.includes('Mobile') ? 'Mobile' : 'Desktop';
      const now = new Date();
      const loginTimeStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      await UserSession.create({
        id: sessionId,
        companyId: sessionCompanyId,   // ← explicit so tenantPlugin doesn't need context
        employeeName: user.name || user.email,
        employeeId: isCompanyAdmin ? (user.companyId || user.id) : user.id,
        role: isCompanyAdmin ? 'Company Admin' : (user.roleId || 'Employee'),
        loginTime: loginTimeStr,
        lastActivity: loginTimeStr,
        duration: '0m',
        deviceType,
        browser,
        os,
        ipAddress: ip,
        location: '—',
        status: 'Active',
        tokenRef: token.slice(-12)
      });
      logger.info(`AuthService::login session recorded [${sessionId}] for ${user.name} (company: ${sessionCompanyId})`);
    }
  } catch (sessionErr) {
    // Non-critical — do not fail login if session record fails
    logger.warn(`AuthService::login session record failed: ${sessionErr.message}`);
  }

  return {
    user: userResponse,
    token
  };
};

export default {
  login
};

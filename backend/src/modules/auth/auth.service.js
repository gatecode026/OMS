/**
 * @file src/modules/auth/auth.service.js
 * @description Authentication Service looking up Super Admin accounts in the dedicated Admin collection.
 */

import jwt from 'jsonwebtoken';
import Admin from '../admin/admin.model.js';
import Employee from '../employees/employees.model.js';
import Company from '../companies/company.model.js';
import env from '../../config/env.js';
import logger from '../../config/logger.js';
import { isDatabaseConnected } from '../../config/database.js';

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

  if (!isDatabaseConnected) {
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

  // Fetch account from the dedicated Super Admin collection
  let user = await Admin.findOne({
    $or: [
      { email: resolvedEmail },
      { email: new RegExp('^' + escapedPrefix + '(@|.*)', 'i') },
      { name: new RegExp('^' + escapedPrefix + '($|\\s)', 'i') }
    ]
  }).select('+password');

  let isEmployee = false;
  let isCompanyAdmin = false;

  if (!user && resolvedCompany) {
    if (resolvedCompany.databaseType === 'dedicated') {
      // Query dedicated database connection using runWithTenant
      const { runWithTenant } = await import('../../utils/tenantContext.js');
      await runWithTenant(resolvedCompany.id, async () => {
        user = await Employee.findOne({ email: resolvedEmail }).select('+password');
        if (!user) {
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
      user = await Employee.findOne({ email: resolvedEmail, companyId: resolvedCompany.id }).select('+password');
      if (!user) {
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

  return {
    user: userResponse,
    token
  };
};

export default {
  login
};

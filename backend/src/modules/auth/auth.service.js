/**
 * @file src/modules/auth/auth.service.js
 * @description Authentication Service looking up Super Admin accounts in the dedicated Admin collection.
 */

import jwt from 'jsonwebtoken';
import Admin from '../admin/admin.model.js';
import Employee from '../employees/employees.model.js';
import env from '../../config/env.js';
import logger from '../../config/logger.js';
import { isDatabaseConnected } from '../../config/database.js';

/**
 * Handles credentials authentication, validates active accounts, and issues signed JWTs.
 * Supporting live Mongoose connections (with super_admin residing in dedicated admins collection).
 * 
 * @param {string} email - User input email.
 * @param {string} password - User input plain password.
 * @returns {Promise<{user: Object, token: string}>} The user payload and valid session token.
 */
export const login = async (email, password) => {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    err.status = 'fail';
    throw err;
  }

  // Normalize input email
  const resolvedEmail = email.toLowerCase().trim();

  console.log(`[DEBUG login] Email received: "${email}" | Password length: ${password ? password.length : 0} | Resolved Email: "${resolvedEmail}"`);

  if (!isDatabaseConnected) {
    logger.error('AuthService::login [Error] Database is not connected');
    const err = new Error('Database connection is offline. Please try again later.');
    err.statusCode = 500;
    err.status = 'error';
    throw err;
  }

  logger.info(`AuthService::login [Database Mode] Verifying credentials for: ${resolvedEmail}`);

  const prefix = resolvedEmail.split('@')[0];

  // Fetch account from the dedicated Super Admin collection or Employee collection
  let user = await Admin.findOne({
    $or: [
      { email: resolvedEmail },
      { email: new RegExp('^' + prefix + '(@|.*)', 'i') },
      { name: new RegExp('^' + prefix + '($|\\s)', 'i') }
    ]
  }).select('+password');

  let isEmployee = false;
  if (!user) {
    user = await Employee.findOne({ email: resolvedEmail }).select('+password');
    if (!user) {
      user = await Employee.findOne({
        $or: [
          { username: prefix },
          { email: new RegExp('^' + prefix + '(@|.*)', 'i') },
          { name: new RegExp('^' + prefix + '($|\\s)', 'i') }
        ]
      }).select('+password');
    }
    if (user) {
      isEmployee = true;
    }
  }

  if (!user) {
    logger.warn(`AuthService::login record not found for: ${resolvedEmail}`);
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.status = 'fail';
    throw err;
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

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.roleId, companyId: user.companyId || 'COMP-DEFAULT' },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  const userResponse = user.toObject();
  delete userResponse.password;

  logger.info(`AuthService::login success for: ${user.name} (${user.roleId})`);

  return {
    user: userResponse,
    token
  };
};

export default {
  login
};

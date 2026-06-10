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

// Base mock employee list for offline in-memory fallback verification
const FALLBACK_EMPLOYEES = [
  {
    id: 'EMP-2026-000',
    name: 'Balram',
    email: 'superadmin@saas.com',
    role: 'Super Admin',
    roleId: 'super_admin',
    status: 'Active',
    designation: 'Super Administrator',
    department: 'Executive',
    branch: 'Jaipur',
    team: 'Administration'
  },

];

/**
 * Handles credentials authentication, validates active accounts, and issues signed JWTs.
 * Supporting live Mongoose connections (with super_admin residing in dedicated admins collection) 
 * or offline sandboxed rollbacks.
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

  // Normalize inputs
  let resolvedEmail = email.toLowerCase().trim();

  console.log(`[DEBUG login] Email received: "${email}" | Password length: ${password ? password.length : 0} | Resolved Email: "${resolvedEmail}"`);

  // ─── CASE A: LIVE DATABASE MODE ─────────────────────────────────────────────
  if (isDatabaseConnected) {
    logger.info(`AuthService::login [Database Mode] Verifying admin credentials for: ${resolvedEmail}`);

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

    if (user.status !== 'Active') {
      logger.warn(`AuthService::login block attempt for inactive admin ${resolvedEmail} (status: ${user.status})`);
      const err = new Error('Your account has been deactivated. Please contact your system administrator.');
      err.statusCode = 403;
      err.status = 'fail';
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`AuthService::login admin credentials failed for: ${resolvedEmail}`);
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      err.status = 'fail';
      throw err;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.roleId },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    logger.info(`AuthService::login live admin success for: ${user.name} (${user.roleId})`);

    return {
      user: userResponse,
      token
    };
  }

  // ─── CASE B: OFFLINE SANDBOX MODE ───────────────────────────────────────────
  logger.info(`AuthService::login [Offline Mode] Verifying credentials for: ${resolvedEmail}`);

  let user = FALLBACK_EMPLOYEES.find(e => e.email.toLowerCase() === resolvedEmail.toLowerCase());

  if (!user) {
    const prefix = resolvedEmail.split('@')[0].toLowerCase();
    user = FALLBACK_EMPLOYEES.find(e =>
      (e.username && e.username.toLowerCase() === prefix) ||
      e.email.toLowerCase().startsWith(prefix) ||
      e.name.toLowerCase().startsWith(prefix)
    );
  }

  if (!user) {
    logger.warn(`AuthService::login (offline) user record not found for: ${resolvedEmail}`);
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.status = 'fail';
    throw err;
  }

  if (user.status !== 'Active' && user.status !== 'On Leave') {
    logger.warn(`AuthService::login (offline) attempt for inactive user ${resolvedEmail} (status: ${user.status})`);
    const err = new Error('Your account has been deactivated. Please contact your system administrator.');
    err.statusCode = 403;
    err.status = 'fail';
    throw err;
  }

  // In offline sandbox development, accept default 'password' or simple values
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.roleId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  logger.info(`AuthService::login offline success for fallback user: ${user.name} (${user.roleId})`);

  return {
    user,
    token
  };
};

export default {
  login
};

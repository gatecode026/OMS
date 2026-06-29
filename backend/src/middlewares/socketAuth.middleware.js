/**
 * @file src/middlewares/socketAuth.middleware.js
 * @description Socket.io Authentication Middleware.
 *   Validates JWT token from handshake and attaches user context to socket.
 *   NOTE: Socket.io connections do NOT go through Express middleware chain,
 *   so AsyncLocalStorage tenant context is NOT available here. We resolve
 *   tenant DB access directly via getTenantConnection() instead.
 */

import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import logger from '../config/logger.js';
import Admin from '../modules/admin/admin.model.js';
import Company from '../modules/companies/company.model.js';
import { TenantRegistry } from '../utils/tenantRegistry.js';
import { getTenantConnection } from '../utils/multidbConnection.js';

/**
 * Socket.io Authentication Middleware
 * Validates JWT token from handshake and attaches user to socket
 */
/**
 * Verifies a JWT token and fetches user details from the database.
 */
export const verifySocketToken = async (token) => {
  const decoded = jwt.verify(token, env.jwtSecret);
  let user = null;
  let companyId = null;

  if (decoded.role === 'super_admin') {
    user = await Admin
      .findOne({ id: decoded.id })
      .select('id name email roleId status avatar')
      .lean();

    if (user) {
      companyId = null;
      user.roleId = user.roleId || 'super_admin';
    }

  } else if (decoded.role === 'company_admin') {
    user = await Company
      .findOne({ id: decoded.id })
      .select('id name email status')
      .lean();

    if (user) {
      companyId = user.id;
      user.roleId = 'company_admin';
    }

  } else {
    const tenantEntry = await TenantRegistry
      .findOne({ email: decoded.email?.toLowerCase() })
      .lean();

    companyId = tenantEntry?.companyId || decoded.companyId || 'COMP-DEFAULT';
    const tenantConn = await getTenantConnection(companyId);

    user = await tenantConn
      .collection('employees')
      .findOne(
        { id: decoded.id },
        {
          projection: {
            id: 1,
            name: 1,
            email: 1,
            roleId: 1,
            status: 1,
            avatar: 1,
            companyId: 1,
            workStatus: 1,
            lastSeen: 1,
            chatStatus: 1,
            statusEmoji: 1,
            statusExpiry: 1,
            branch: 1
          }
        }
      );
  }

  if (!user) {
    throw new Error('Authentication failed: User not found');
  }

  if (user.status !== 'Active' && user.status !== 'On Leave') {
    throw new Error('Authentication failed: Account inactive');
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleId || decoded.role,
      companyId,
      avatar: user.avatar || null,
      chatStatus: user.chatStatus || 'available',
      statusEmoji: user.statusEmoji || null,
      statusExpiry: user.statusExpiry || null,
      branch: user.branch || null
    },
    companyId,
    tokenExp: decoded.exp
  };
};

/**
 * Socket.io Authentication Middleware
 * Validates JWT token from handshake and attaches user to socket
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token = null;

    if (socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }
    else if (socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      logger.warn('[Socket.io] Connection rejected — No token provided');
      return next(new Error('Authentication failed: No token provided'));
    }

    // Check if token has been blacklisted/revoked
    const { isTokenBlacklisted } = await import('../services/security.service.js');
    if (await isTokenBlacklisted(token)) {
      logger.warn('[Socket.io] Connection rejected — Revoked token presented');
      return next(new Error('Authentication failed: Session revoked'));
    }

    const { user, companyId, tokenExp } = await verifySocketToken(token);

    socket.user = user;
    socket.companyId = companyId;
    socket.tokenExp = tokenExp;

    logger.info(
      `[Socket.io] Authenticated: ${user.name} (${socket.user.role}) — Company: ${companyId}`
    );
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('[Socket.io] Invalid JWT token');
      return next(new Error('Authentication failed: Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      logger.warn('[Socket.io] Expired JWT token');
      return next(new Error('Authentication failed: Token expired'));
    }
    logger.error('[Socket.io] Auth middleware error:', error.message || error);
    return next(new Error(error.message || 'Authentication failed: Server error'));
  }
};

export default socketAuthMiddleware;

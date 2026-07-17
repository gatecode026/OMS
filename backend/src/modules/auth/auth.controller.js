import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import service from './auth.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Controller endpoint processing login actions.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, companyCode } = req.body;
  
  // Extract subdomain from request host
  let subdomain = null;
  const host = req.headers.host;
  if (host) {
    const hostname = host.split(':')[0];
    const parts = hostname.split('.');
    if (parts.length > 2) {
      subdomain = parts[0];
    } else if (parts.length === 2 && (parts[1] === 'localhost' || parts[1] === 'local')) {
      subdomain = parts[0];
    }
  }

  // Capture real IP and User-Agent for session tracking
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || '—';
  const userAgent = req.headers['user-agent'] || '';

  const data = await service.login(email, password, { companyCode, subdomain, ip, userAgent });
  return successResponse(res, data, 'Authenticated successfully');
});

/**
 * Logout endpoint — removes the session record for the current user.
 */
export const logout = asyncHandler(async (req, res) => {
  try {
    const { UserSession } = await import('../security/security.model.js');
    // Delete all sessions belonging to this user (matched by employeeId)
    const userId = req.user?.id;
    if (userId) {
      await UserSession.deleteMany({ employeeId: userId });
    }
  } catch (e) {
    // Non-critical
  }
  return successResponse(res, {}, 'Logged out successfully');
});

/**
 * Silent JWT token refresh endpoint
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { id, email, role, companyId } = req.user;
  
  const token = jwt.sign(
    { 
      id, 
      email, 
      role, 
      roleId: role, 
      companyId 
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return successResponse(res, { token }, 'Token refreshed successfully');
});

export default {
  login,
  logout,
  refreshToken
};

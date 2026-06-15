/**
 * @file src/modules/auth/auth.controller.js
 * @description Controllers for Auth module.
 */

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

  const data = await service.login(email, password, { companyCode, subdomain });
  return successResponse(res, data, 'Authenticated successfully');
});

export default {
  login
};

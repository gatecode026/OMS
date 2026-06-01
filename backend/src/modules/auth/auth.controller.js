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
  const { email, password } = req.body;
  const data = await service.login(email, password);
  return successResponse(res, data, 'Authenticated successfully');
});

export default {
  login
};

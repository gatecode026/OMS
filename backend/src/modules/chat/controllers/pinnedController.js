/**
 * @file src/modules/chat/controllers/pinnedController.js
 * @description Controller for pinned messages inside a conversation.
 */

import * as pinnedService from '../services/pinnedService.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { successResponse } from '../../../utils/response.js';

// GET /api/v1/chat/conversations/:conversationId/pinned
export const getPinnedMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { id: employeeId, companyId } = req.user;
  const { page, limit, search, filter, sortBy } = req.query;

  try {
    const data = await pinnedService.getPinnedMessages(conversationId, employeeId, companyId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      filter,
      sortBy
    });
    return successResponse(res, data, 'Pinned messages fetched successfully');
  } catch (error) {
    if (error.message.includes('access denied') || error.message.includes('not found')) {
      return res.status(403).json({
        status: 'fail',
        message: error.message
      });
    }
    throw error;
  }
});

/**
 * @file src/modules/chat/controllers/pinnedController.js
 * @description Controller for pinned messages inside a conversation.
 */

import * as pinnedService from '../services/pinnedService.js';
import * as chatService from '../chat.service.js';
import { getIO } from '../../../config/socket.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { successResponse } from '../../../utils/response.js';
import { getIO } from '../../../config/socket.js';

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

// POST /api/v1/chat/conversations/:conversationId/messages/:messageId/pin
export const pinMessage = asyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;
  const { id: employeeId, name: employeeName, companyId } = req.user;

  const result = await chatService.pinMessage(messageId, employeeId, employeeName, companyId);
  try {
    const io = getIO();
    io.to(`conv:${conversationId}`).emit("message_pinned", {
      messageId,
      conversationId,
      pinnedBy: employeeId,
      pinnedByName: employeeName,
      pinnedAt: new Date()
    });
  } catch (err) {}

  return successResponse(res, result, 'Message pinned successfully');
});

// DELETE /api/v1/chat/conversations/:conversationId/messages/:messageId/pin
export const unpinMessage = asyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const result = await chatService.unpinMessage(messageId, companyId);
  try {
    const io = getIO();
    io.to(`conv:${conversationId}`).emit("message_unpinned", {
      messageId,
      conversationId,
      unpinnedBy: employeeId
    });
  } catch (err) {}

  return successResponse(res, result, 'Message unpinned successfully');
});

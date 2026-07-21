/**
 * @file src/modules/chat/controllers/pinnedController.js
 * @description Controller for pinned messages inside a conversation.
 */

import * as pinnedService from '../services/pinnedService.js';
import * as chatService from '../chat.service.js';
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
  const { id: employeeId, companyId } = req.user;

  const msg = await chatService.pinMessage(messageId, employeeId, companyId);
  if (!msg) {
    return res.status(404).json({ status: 'fail', message: 'Message not found' });
  }

  // Broadcast to conversation room
  const io = getIO();
  if (io) {
    io.to(`conv:${conversationId}`).emit("message_pinned", {
      messageId,
      conversationId,
      pinnedBy: employeeId,
      pinnedAt: new Date(),
    });
  }

  return successResponse(res, msg, 'Message pinned successfully');
});

// DELETE /api/v1/chat/conversations/:conversationId/messages/:messageId/pin
export const unpinMessage = asyncHandler(async (req, res) => {
  const { conversationId, messageId } = req.params;
  const { companyId } = req.user;

  const msg = await chatService.unpinMessage(messageId, companyId);
  if (!msg) {
    return res.status(404).json({ status: 'fail', message: 'Message not found' });
  }

  // Broadcast to conversation room
  const io = getIO();
  if (io) {
    io.to(`conv:${conversationId}`).emit("message_unpinned", {
      messageId,
      conversationId,
      unpinnedBy: req.user.id,
    });
  }

  return successResponse(res, msg, 'Message unpinned successfully');
});

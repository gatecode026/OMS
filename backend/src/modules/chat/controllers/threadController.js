/**
 * @file src/modules/chat/controllers/threadController.js
 * @description Controller handlers for Thread REST API endpoints.
 */

import * as threadService from '../services/threadService.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { successResponse } from '../../../utils/response.js';

// POST /api/v1/chat/threads
export const createThread = asyncHandler(async (req, res) => {
  const { rootMessageId } = req.body;
  const { id: employeeId, companyId } = req.user;

  if (!rootMessageId) {
    return res.status(400).json({ status: 'fail', message: 'rootMessageId is required' });
  }

  const thread = await threadService.createThread(rootMessageId, employeeId, companyId);
  return successResponse(res, thread, 'Thread created successfully');
});

// GET /api/v1/chat/threads/:threadId
export const getThreadDetails = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { id: employeeId, companyId } = req.user;

  try {
    const thread = await threadService.getThreadDetails(threadId, employeeId, companyId);
    return successResponse(res, thread, 'Thread details fetched successfully');
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('not found')) {
      return res.status(403).json({ status: 'fail', message: error.message });
    }
    throw error;
  }
});

// GET /api/v1/chat/threads/:threadId/messages
export const getThreadReplies = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { id: employeeId, companyId } = req.user;
  const { cursor, limit } = req.query;

  try {
    const data = await threadService.getThreadReplies(threadId, employeeId, companyId, {
      cursor,
      limit: parseInt(limit) || 20
    });
    return successResponse(res, data, 'Thread replies fetched successfully');
  } catch (error) {
    if (error.message.includes('Access denied')) {
      return res.status(403).json({ status: 'fail', message: error.message });
    }
    throw error;
  }
});

// POST /api/v1/chat/threads/:threadId/reply
export const sendThreadReply = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { id: senderId, name: senderName, avatar: senderAvatar, role: senderRole, companyId } = req.user;
  const { content, type, media, tempId } = req.body;

  try {
    const reply = await threadService.sendThreadReply(
      threadId,
      senderId,
      senderName,
      senderAvatar || null,
      senderRole || 'employee',
      { content, type, media, tempId },
      companyId
    );
    return successResponse(res, reply, 'Reply sent successfully');
  } catch (error) {
    if (error.message.includes('Access denied') || error.message.includes('closed')) {
      return res.status(403).json({ status: 'fail', message: error.message });
    }
    throw error;
  }
});

// POST /api/v1/chat/threads/:threadId/follow
export const followThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const thread = await threadService.followThread(threadId, employeeId, companyId);
  return successResponse(res, thread, 'Thread followed successfully');
});

// POST /api/v1/chat/threads/:threadId/unfollow
export const unfollowThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const thread = await threadService.unfollowThread(threadId, employeeId, companyId);
  return successResponse(res, thread, 'Thread unfollowed successfully');
});

// POST /api/v1/chat/threads/:threadId/read
export const markThreadAsRead = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const thread = await threadService.markThreadAsRead(threadId, employeeId, companyId);
  return successResponse(res, thread, 'Thread marked as read');
});

// PATCH /api/v1/chat/threads/:threadId/status
export const updateThreadStatus = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { status } = req.body;
  const { id: employeeId, companyId } = req.user;

  if (!status) {
    return res.status(400).json({ status: 'fail', message: 'Status is required' });
  }

  const thread = await threadService.updateThreadStatus(threadId, status, employeeId, companyId);
  return successResponse(res, thread, 'Thread status updated successfully');
});

// GET /api/v1/chat/threads/activity
export const getThreadActivityList = asyncHandler(async (req, res) => {
  const { id: employeeId, companyId } = req.user;

  const threads = await threadService.getThreadActivityList(employeeId, companyId);
  return successResponse(res, threads, 'Thread activity list fetched successfully');
});

// GET /api/v1/chat/threads/search
export const searchThreads = asyncHandler(async (req, res) => {
  const { id: employeeId, companyId } = req.user;
  const { q, threadId, status, mention } = req.query;

  const replies = await threadService.searchThreads(employeeId, companyId, {
    q,
    threadId,
    status,
    mention: mention === 'true'
  });
  return successResponse(res, replies, 'Thread search completed');
});

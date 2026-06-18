/**
 * @file src/modules/chat/chat.controller.js
 * @description Express controller handlers for all REST chat API endpoints.
 *   Delegates all business logic to chat.service.js.
 */

import * as chatService from './chat.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/response.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import { getIO } from '../../config/socket.js';

// ─── HELPER ──────────────────────────────────────────────────────────────────

/**
 * Fetch a single employee's info directly from tenant DB.
 * Used to hydrate user1/user2 objects for service calls.
 */
const getEmployeeInfo = async (employeeId, companyId) => {
  const conn = await getTenantConnection(companyId);
  return conn.collection('employees').findOne(
    { id: employeeId },
    { projection: { id: 1, name: 1, avatar: 1, roleId: 1,
                    status: 1, workStatus: 1, lastSeen: 1 } }
  );
};

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────

// GET /api/v1/chat/conversations
export const getConversations = asyncHandler(async (req, res) => {
  const { id: employeeId, companyId } = req.user;
  const data = await chatService.getUserConversations(employeeId, companyId);
  return successResponse(res, data, 'Conversations fetched');
});

// POST /api/v1/chat/conversations/direct
export const startDirectChat = asyncHandler(async (req, res) => {
  const { targetEmployeeId } = req.body;
  const { id: myId, companyId } = req.user;

  if (!targetEmployeeId)
    return res.status(400).json({
      status: 'fail', message: 'targetEmployeeId is required'
    });
  if (targetEmployeeId === myId)
    return res.status(400).json({
      status: 'fail', message: 'Cannot chat with yourself'
    });

  const myInfo = await getEmployeeInfo(myId, companyId);
  const targetInfo = await getEmployeeInfo(targetEmployeeId, companyId);

  if (!targetInfo)
    return res.status(404).json({
      status: 'fail', message: 'Employee not found'
    });

  const result = await chatService.getOrCreateDirectConversation(
    { id: myId, name: myInfo?.name || req.user.name,
      avatar: myInfo?.avatar, role: myInfo?.roleId || req.user.role },
    { id: targetEmployeeId, name: targetInfo.name,
      avatar: targetInfo.avatar, role: targetInfo.roleId },
    companyId
  );

  return successResponse(
    res, result,
    result.isNew ? 'Conversation created' : 'Conversation found',
    result.isNew ? 201 : 200
  );
});

// POST /api/v1/chat/conversations/group
export const createGroup = asyncHandler(async (req, res) => {
  const { name, description, participantIds, avatar } = req.body;
  const { id: myId, companyId } = req.user;

  if (!name || !participantIds?.length)
    return res.status(400).json({
      status: 'fail', message: 'name and participantIds are required'
    });

  const myInfo = await getEmployeeInfo(myId, companyId);
  const conn = await getTenantConnection(companyId);

  // Fetch all valid active participants
  const participants = await conn.collection('employees').find(
    { id: { $in: participantIds }, status: 'Active' },
    { projection: { id: 1, name: 1, avatar: 1, roleId: 1 } }
  ).toArray();

  const conversation = await chatService.createGroupConversation(
    { id: myId, name: myInfo?.name || req.user.name,
      avatar: myInfo?.avatar, role: myInfo?.roleId || req.user.role },
    { name, description, avatar },
    participants.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, role: p.roleId
    })),
    companyId
  );

  // Real-time socket join and notify
  try {
    const io = getIO();
    conversation.participants.forEach(p => {
      io.to(`user:${p.employeeId}`).emit('new_conversation', conversation);
      io.in(`user:${p.employeeId}`).socketsJoin(`conv:${conversation.id}`);
    });
  } catch (socketErr) {
    // ignore or log socket errors gracefully
  }

  return successResponse(res, conversation, 'Group created', 201);
});

// ─── MESSAGES ────────────────────────────────────────────────────────────────

// GET /api/v1/chat/conversations/:id/messages
export const getMessages = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: employeeId, companyId } = req.user;
  const cursor = req.query.cursor || null;
  const limit = parseInt(req.query.limit) || 50;

  const data = await chatService.getMessages(
    conversationId, employeeId, companyId, cursor, limit
  );
  return successResponse(res, data, 'Messages fetched');
});

// GET /api/v1/chat/messages/:id
export const getMessageDetail = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const data = await chatService.getMessageDetail(
    messageId, employeeId, companyId
  );
  return successResponse(res, data, 'Message details fetched');
});

// PATCH /api/v1/chat/conversations/:id/read
export const markRead = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: employeeId, name, companyId } = req.user;

  const result = await chatService.markAsRead(
    conversationId, employeeId, name, companyId
  );
  return successResponse(res, result, 'Messages marked as read');
});

// GET /api/v1/chat/conversations/:id/search
export const searchInConversation = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: employeeId, companyId } = req.user;
  const { q } = req.query;

  if (!q?.trim())
    return res.status(400).json({
      status: 'fail', message: 'Search query (q) is required'
    });

  const messages = await chatService.searchMessages(
    conversationId, q.trim(), employeeId, companyId
  );
  return successResponse(res, messages, 'Search results');
});

// DELETE /api/v1/chat/messages/:id
export const deleteMsg = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const { id: employeeId, companyId } = req.user;
  const deleteForEveryone = req.body.deleteForEveryone === true;

  const result = await chatService.deleteMessage(
    messageId, employeeId, deleteForEveryone, companyId
  );
  return successResponse(res, result, 'Message deleted');
});

// PATCH /api/v1/chat/messages/:id/edit
export const editMsg = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const { id: employeeId, companyId } = req.user;
  const { content } = req.body;

  if (!content?.trim())
    return res.status(400).json({
      status: 'fail', message: 'Content is required'
    });

  const result = await chatService.editMessage(
    messageId, employeeId, content.trim(), companyId
  );
  return successResponse(res, result, 'Message edited');
});

// POST /api/v1/chat/messages/:id/react
export const reactToMessage = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const { id: employeeId, name, companyId } = req.user;
  const { emoji } = req.body;

  if (!emoji)
    return res.status(400).json({
      status: 'fail', message: 'Emoji is required'
    });

  const result = await chatService.addReaction(
    messageId, employeeId, name, emoji, companyId
  );
  return successResponse(res, result, 'Reaction added');
});

// ─── GROUP MANAGEMENT ─────────────────────────────────────────────────────────

// POST /api/v1/chat/conversations/:id/members
export const addMembers = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: adminId, companyId } = req.user;
  const memberIds = req.body.memberIds || req.body.employeeIds;

  if (!memberIds?.length)
    return res.status(400).json({
      status: 'fail', message: 'memberIds array is required'
    });

  const conn = await getTenantConnection(companyId);
  const members = await conn.collection('employees').find(
    { id: { $in: memberIds } },
    { projection: { id: 1, name: 1, avatar: 1 } }
  ).toArray();

  const result = await chatService.addGroupMembers(
    conversationId, adminId,
    members.map(m => ({ id: m.id, name: m.name, avatar: m.avatar })),
    companyId
  );

  try {
    const io = getIO();
    if (result.conversation) {
      io.to(`conv:${conversationId}`).emit('member_added', {
        conversationId,
        participants: result.conversation.participants
      });

      members.forEach(m => {
        io.to(`user:${m.id}`).emit('new_conversation', result.conversation);
        io.in(`user:${m.id}`).socketsJoin(`conv:${conversationId}`);
      });
    }
  } catch (socketErr) {
    // handle socket error
  }

  return successResponse(res, result, 'Members added');
});

// DELETE /api/v1/chat/conversations/:id/members/:memberId
export const removeMember = asyncHandler(async (req, res) => {
  const { id: conversationId, memberId } = req.params;
  const { id: adminId, companyId } = req.user;

  const result = await chatService.removeGroupMember(
    conversationId, adminId, memberId, companyId
  );

  try {
    const io = getIO();
    if (result.conversation) {
      io.to(`conv:${conversationId}`).emit('member_removed', {
        conversationId,
        employeeId: memberId,
        participants: result.conversation.participants
      });
    }
    io.to(`user:${memberId}`).emit('conversation_removed', { conversationId });
    io.in(`user:${memberId}`).socketsLeave(`conv:${conversationId}`);
  } catch (socketErr) {
    // handle socket error
  }

  return successResponse(res, result, 'Member removed');
});

// ─── EMPLOYEE SEARCH ─────────────────────────────────────────────────────────

// GET /api/v1/chat/employees?q=<search>
export const searchEmployees = asyncHandler(async (req, res) => {
  const { id: myId, companyId } = req.user;
  const { q } = req.query;

  const conn = await getTenantConnection(companyId);
  const query = { id: { $ne: myId }, status: 'Active' };

  if (q?.trim()) {
    query.$or = [
      { name:        { $regex: q.trim(), $options: 'i' } },
      { email:       { $regex: q.trim(), $options: 'i' } },
      { designation: { $regex: q.trim(), $options: 'i' } }
    ];
  }

  const employees = await conn.collection('employees').find(
    query,
    {
      projection: {
        id: 1, name: 1, avatar: 1, designation: 1,
        department: 1, workStatus: 1, lastSeen: 1, roleId: 1
      }
    }
  ).limit(20).toArray();

  return successResponse(res, employees, 'Employees fetched');
});

// PATCH /api/v1/chat/conversations/:id
export const updateGroupDetails = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: adminId, companyId } = req.user;
  const groupData = req.body;

  const conversation = await chatService.updateGroupDetails(
    conversationId, adminId, groupData, companyId
  );

  try {
    const io = getIO();
    io.to(`conv:${conversationId}`).emit('group_updated', conversation);
  } catch (err) {}

  return successResponse(res, conversation, 'Group details updated');
});

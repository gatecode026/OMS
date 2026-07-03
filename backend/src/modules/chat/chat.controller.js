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
import Call from './call.model.js';
import logger from '../../config/logger.js';
import crypto from 'crypto';
import { CacheKeys, TTL, cacheGetOrSet } from '../../services/cache.service.js';
import Message from './message.model.js';
import Conversation from './conversation.model.js';
import ImageKitCleanupLog from './cleanupLog.model.js';
import ActivityLog from '../activity-logs/activity-log.model.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';

// ─── HELPER ──────────────────────────────────────────────────────────────────

/**
 * Fetch a single employee's info directly from tenant DB.
 * Used to hydrate user1/user2 objects for service calls.
 */
const getEmployeeInfo = async (employeeId, companyId) => {
  const cacheKey = CacheKeys.user(companyId, employeeId);
  return cacheGetOrSet(cacheKey, async () => {
    const conn = await getTenantConnection(companyId);
    return conn.collection('employees').findOne(
      { id: employeeId },
      { projection: { id: 1, name: 1, avatar: 1, roleId: 1,
                      status: 1, workStatus: 1, lastSeen: 1 } }
    );
  }, TTL.USER_PROFILE);
};

/**
 * Write to multi-tenant Activity / Audit log
 */
const logChatActivity = async (companyId, { actor, actionType, fieldChanged, oldValue, newValue }) => {
  try {
    const logId = await generateCompanyUniqueId(companyId, 'activity_logs');
    await ActivityLog.create({
      id: logId,
      companyId,
      timestamp: new Date().toISOString(),
      actor: actor || 'System',
      actionType,
      fieldChanged: fieldChanged || '—',
      oldValue: oldValue || '—',
      newValue: newValue || '—',
      ip: '127.0.0.1'
    });
  } catch (err) {
    logger.error('[ChatController] Failed to write ActivityLog:', err);
  }
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

  if (result.isNew && result.conversation) {
    try {
      const io = getIO();
      result.conversation.participants.forEach(p => {
        io.to(`user:${p.employeeId}`).emit('new_conversation', result.conversation);
        io.in(`user:${p.employeeId}`).socketsJoin(`conv:${result.conversation.id}`);
      });
    } catch (socketErr) {
      logger.error('[ChatController] startDirectChat socket error:', socketErr);
    }
  }

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
    { id: { $in: participantIds }, status: { $ne: 'Inactive' } },
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

// PATCH /api/v1/chat/conversations/:id/unread
export const markUnread = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const result = await chatService.markAsUnread(
    conversationId, employeeId, companyId
  );
  return successResponse(res, result, 'Messages marked as unread');
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

// POST /api/v1/chat/conversations/:id/clear
export const clearChat = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const result = await chatService.clearConversationMessages(
    conversationId, employeeId, companyId
  );
  return successResponse(res, result, 'Chat cleared successfully');
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
  const query = { id: { $ne: myId }, status: { $ne: 'Inactive' } };

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

// POST /api/v1/chat/messages/bulk-delete
export const deleteMessagesBulk = asyncHandler(async (req, res) => {
  const { messageIds } = req.body;
  const { id: employeeId, companyId } = req.user;

  if (!messageIds?.length) {
    return res.status(400).json({
      status: 'fail',
      message: 'messageIds array is required'
    });
  }

  const result = await chatService.deleteMessagesBulk(
    messageIds, employeeId, companyId
  );
  return successResponse(res, result, 'Messages deleted in bulk');
});

// GET /api/v1/chat/calls/history
export const getCallHistory = asyncHandler(async (req, res) => {
  const { id: employeeId } = req.user;
  const calls = await Call.find({
    $or: [
      { callerId: employeeId },
      { calleeId: employeeId }
    ]
  }).sort({ createdAt: -1 }).limit(50).lean();

  return successResponse(res, calls, 'Call history fetched');
});

// POST /api/v1/chat/calls/:callId/reject
export const rejectCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const callRecord = await Call.findOneAndUpdate(
    { id: callId, status: 'ringing' },
    { status: 'rejected', endedAt: new Date() },
    { new: true }
  );

  if (!callRecord) {
    return res.status(404).json({
      status: 'fail',
      message: 'Active call record not found or already processed'
    });
  }

  const otherPartyId = callRecord.callerId === employeeId ? callRecord.calleeId : callRecord.callerId;

  try {
    const io = getIO();
    const rejectPayload = {
      callId,
      reason: 'rejected',
      calleeName: req.user.name,
      calleeId: callRecord.calleeId,
      callerId: callRecord.callerId
    };
    io.to(`user:${callRecord.callerId}`).emit('call:rejected', rejectPayload);
    io.to(`user:${callRecord.calleeId}`).emit('call:rejected', rejectPayload);

    // Write call history message
    const isVideo = callRecord.callType === 'video';
    const statusText = `${isVideo ? 'Video' : 'Voice'} Call · Declined`;

    const savedMessage = await chatService.saveMessage({
      conversationId: callRecord.conversationId,
      senderId: callRecord.callerId,
      senderName: callRecord.callerName,
      senderAvatar: callRecord.callerAvatar || null,
      senderRole: 'employee',
      content: statusText,
      type: 'call'
    }, companyId);

    io.to(`conv:${callRecord.conversationId}`).emit('message:new', {
      id: savedMessage.id,
      conversationId: callRecord.conversationId,
      senderId: callRecord.callerId,
      senderName: callRecord.callerName,
      senderAvatar: callRecord.callerAvatar || null,
      preview: statusText,
      type: 'call',
      content: statusText,
      createdAt: savedMessage.createdAt
    });
  } catch (socketErr) {
    logger.warn('[Chat Controller] Socket notification failed for call reject:', socketErr.message);
  }

  return successResponse(res, callRecord, 'Call rejected successfully');
});

// GET /api/v1/chat/imagekit/auth
export const getImageKitAuth = asyncHandler(async (req, res) => {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({
      status: 'error',
      message: 'ImageKit private key is not configured on the server'
    });
  }

  const token = req.query.token || crypto.randomBytes(16).toString('hex');
  // Expire in 1 hour (3600 seconds)
  const expire = req.query.expire || Math.floor(Date.now() / 1000) + 3600;

  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');

  return successResponse(res, {
    token,
    expire,
    signature,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_CpBAKCTW3cCxoXfv'
  }, 'ImageKit authentication parameters generated successfully');
});

// DELETE /api/v1/chat/messages/:id/permanent
export const deleteMsgPermanent = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const { id: employeeId, companyId, role } = req.user;

  // Authorization check: Only sender or company admin / super admin can permanently delete
  const message = await Message.findOne({ id: messageId });
  if (!message) {
    return res.status(404).json({
      status: 'fail',
      message: 'Message not found'
    });
  }

  if (message.senderId !== employeeId && role !== 'admin' && role !== 'super_admin') {
    return res.status(403).json({
      status: 'fail',
      message: 'Access denied: Only sender or administrator can permanently delete message'
    });
  }

  const result = await chatService.deleteMessagePermanently(messageId, companyId);
  return successResponse(res, result, 'Message permanently deleted');
});

// DELETE /api/v1/chat/conversations/:id
export const deleteGroup = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: userId, companyId, name: userName } = req.user;

  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) {
    return res.status(404).json({ status: 'fail', message: 'Group not found' });
  }

  // Verify requester has isAdmin: true in participants array
  const participant = conv.participants.find(p => p.employeeId === userId);
  if (!participant || !participant.isAdmin) {
    return res.status(403).json({ status: 'fail', message: 'Access denied: Only group admin can delete the group' });
  }

  // Soft delete conversation
  conv.isDeleted = true;
  conv.deletedAt = new Date();
  if (!conv.deletedBy) conv.deletedBy = [];
  conv.deletedBy.push({ userId, deletedAt: new Date(), clearHistory: false });
  await conv.save();

  // Mark all messages as conversationDeleted: true
  await Message.updateMany({ conversationId }, { conversationDeleted: true });

  // Emit group:deleted to entire room
  try {
    const io = getIO();
    io.to(`conv:${conversationId}`).emit('group:deleted', {
      conversationId,
      deletedBy: userId,
      groupName: conv.name
    });

    // Force all members out
    io.socketsLeave(`conv:${conversationId}`);
  } catch (err) {
    // socket errors are handled/ignored gracefully
  }

  // Log in audit
  await logChatActivity(companyId, {
    actor: userName,
    actionType: 'group.deleted',
    fieldChanged: 'isDeleted',
    oldValue: 'false',
    newValue: 'true'
  });

  return successResponse(res, null, 'Group deleted successfully');
});

// DELETE /api/v1/chat/conversations/:id/me
export const deleteConversationForMe = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: userId, companyId } = req.user;

  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) {
    return res.status(404).json({ status: 'fail', message: 'Conversation not found' });
  }

  // Add/Update entry in deletedBy array
  if (!conv.deletedBy) conv.deletedBy = [];
  
  // Remove existing delete/clear entry for this user if any
  conv.deletedBy = conv.deletedBy.filter(d => d.userId !== userId);
  conv.deletedBy.push({ userId, deletedAt: new Date(), clearHistory: false });
  
  await conv.save();

  // Emit socket event to self only
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('conversation:deleted_for_me', { conversationId });
  } catch (err) {
    // socket errors are handled/ignored gracefully
  }

  return successResponse(res, null, 'Conversation deleted for you successfully');
});

// POST /api/v1/chat/conversations/:id/clear
export const clearChatHistory = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: userId, companyId } = req.user;

  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) {
    return res.status(404).json({ status: 'fail', message: 'Conversation not found' });
  }

  // Add/Update entry in deletedBy array with clearHistory: true
  if (!conv.deletedBy) conv.deletedBy = [];
  
  conv.deletedBy = conv.deletedBy.filter(d => d.userId !== userId);
  conv.deletedBy.push({ userId, deletedAt: new Date(), clearHistory: true });
  
  await conv.save();

  // Emit socket event to self only
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('conversation:cleared', { conversationId });
  } catch (err) {
    // socket errors are handled/ignored gracefully
  }

  return successResponse(res, null, 'Chat history cleared successfully');
});

// POST /api/v1/chat/conversations/:id/hide
export const hideConversation = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: userId, companyId } = req.user;

  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) {
    return res.status(404).json({ status: 'fail', message: 'Conversation not found' });
  }

  if (!conv.hiddenBy) conv.hiddenBy = [];
  if (!conv.hiddenBy.some(h => h.userId === userId)) {
    conv.hiddenBy.push({ userId, hiddenAt: new Date() });
    await conv.save();
  }

  // Emit socket event to self only
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('conversation:hidden', { conversationId });
  } catch (err) {
    // socket errors are handled/ignored gracefully
  }

  return successResponse(res, null, 'Conversation hidden successfully');
});

// POST /api/v1/chat/conversations/:id/unhide
export const unhideConversation = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: userId, companyId } = req.user;

  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) {
    return res.status(404).json({ status: 'fail', message: 'Conversation not found' });
  }

  if (conv.hiddenBy) {
    conv.hiddenBy = conv.hiddenBy.filter(h => h.userId !== userId);
    await conv.save();
  }

  // Emit socket event to self only
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('conversation:unhidden', { conversationId });
  } catch (err) {
    // socket errors are handled/ignored gracefully
  }

  return successResponse(res, null, 'Conversation unhidden successfully');
});

// POST /api/v1/chat/conversations/:id/archive
export const archiveConversation = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: userId, companyId } = req.user;

  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) {
    return res.status(404).json({ status: 'fail', message: 'Conversation not found' });
  }

  // Auto un-hide when archiving
  if (conv.hiddenBy) {
    conv.hiddenBy = conv.hiddenBy.filter(h => h.userId !== userId);
  }

  if (!conv.archivedBy) conv.archivedBy = [];
  if (!conv.archivedBy.some(a => a.userId === userId)) {
    conv.archivedBy.push({ userId, archivedAt: new Date() });
    await conv.save();
  }

  // Emit socket event to self only
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('conversation:archived', { conversationId });
  } catch (err) {
    // socket errors are handled/ignored gracefully
  }

  return successResponse(res, null, 'Conversation archived successfully');
});

// POST /api/v1/chat/conversations/:id/unarchive
export const unarchiveConversation = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { id: userId, companyId } = req.user;

  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) {
    return res.status(404).json({ status: 'fail', message: 'Conversation not found' });
  }

  if (conv.archivedBy) {
    conv.archivedBy = conv.archivedBy.filter(a => a.userId !== userId);
    await conv.save();
  }

  // Emit socket event to self only
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('conversation:unarchived', { conversationId });
  } catch (err) {
    // socket errors are handled/ignored gracefully
  }

  return successResponse(res, null, 'Conversation unarchived successfully');
});

// GET /api/v1/chat/conversations/archived
export const getArchivedConversations = asyncHandler(async (req, res) => {
  const { id: employeeId, companyId } = req.user;
  const data = await chatService.getArchivedConversations(employeeId, companyId);
  return successResponse(res, data, 'Archived conversations fetched');
});

// GET /api/v1/chat/conversations/hidden
export const getHiddenConversations = asyncHandler(async (req, res) => {
  const { id: employeeId, companyId } = req.user;
  const data = await chatService.getHiddenConversations(employeeId, companyId);
  return successResponse(res, data, 'Hidden conversations fetched');
});

// GET /api/v1/chat/admin/cleanup/stats
export const getCleanupStats = asyncHandler(async (req, res) => {
  const { companyId } = req.user;

  // 1. Query active attachment counts and sizes in MongoDB
  const activeMessagesCount = await Message.countDocuments({
    companyId,
    isDeleted: false,
    'media.url': { $ne: null }
  });

  const activeMessagesSizeResult = await Message.aggregate([
    { $match: { companyId, isDeleted: false, 'media.url': { $ne: null } } },
    { $group: { _id: null, totalSize: { $sum: '$media.fileSize' } } }
  ]);
  const activeMessagesSize = activeMessagesSizeResult[0]?.totalSize || 0;

  // 2. Query soft-deleted attachment counts and sizes in MongoDB
  const softDeletedCount = await Message.countDocuments({
    companyId,
    isDeleted: true,
    'media.imageKitFileId': { $ne: null }
  });

  const softDeletedSizeResult = await Message.aggregate([
    { $match: { companyId, isDeleted: true, 'media.imageKitFileId': { $ne: null } } },
    { $group: { _id: null, totalSize: { $sum: '$media.fileSize' } } }
  ]);
  const softDeletedSize = softDeletedSizeResult[0]?.totalSize || 0;

  // 3. Fetch cleanup logs
  const logs = await ImageKitCleanupLog.find({ companyId })
    .sort({ runDate: -1 })
    .limit(10)
    .lean();

  // 4. Summarize logs stats
  const totalLogsCount = await ImageKitCleanupLog.countDocuments({ companyId });
  const totalSpaceReclaimedResult = await ImageKitCleanupLog.aggregate([
    { $match: { companyId, status: 'success' } },
    { $group: { _id: null, totalReclaimed: { $sum: '$spaceReclaimed' }, totalDeleted: { $sum: '$filesDeleted' } } }
  ]);
  const totalSpaceReclaimed = totalSpaceReclaimedResult[0]?.totalReclaimed || 0;
  const totalFilesDeleted = totalSpaceReclaimedResult[0]?.totalDeleted || 0;

  // 5. Try calling ImageKit list files to get actual storage stats (catch errors)
  let ikTotalFiles = 0;
  let ikTotalSize = 0;
  let ikConnected = false;
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (privateKey && !privateKey.includes('***')) {
      const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
      const response = await fetch('https://api.imagekit.io/v1/files?limit=1000', {
        method: 'GET',
        headers: { 'Authorization': authHeader }
      });
      if (response.ok) {
        const files = await response.json();
        ikConnected = true;
        ikTotalFiles = files.length;
        ikTotalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
      }
    }
  } catch (err) {
    logger.error('[Chat Admin] Failed to fetch stats from ImageKit API:', err);
  }

  return successResponse(res, {
    dbStats: {
      activeAttachmentsCount: activeMessagesCount,
      activeAttachmentsSize: activeMessagesSize,
      softDeletedAttachmentsCount: softDeletedCount,
      softDeletedAttachmentsSize: softDeletedSize
    },
    imageKitStats: {
      connected: ikConnected,
      totalFiles: ikTotalFiles,
      totalSize: ikTotalSize
    },
    cleanupStats: {
      totalRuns: totalLogsCount,
      totalSpaceReclaimed,
      totalFilesDeleted,
      logs
    }
  }, 'Cleanup stats retrieved successfully');
});

// POST /api/v1/chat/admin/cleanup/trigger
export const triggerCleanupManual = asyncHandler(async (req, res) => {
  const { cleanImageKitFiles } = await import('../../jobs/imagekitCleanup.job.js');
  
  const result = await cleanImageKitFiles();
  
  if (result.status === 'failed') {
    return res.status(500).json({
      status: 'fail',
      message: result.error || 'Cleanup job failed'
    });
  }

  return successResponse(res, result, 'ImageKit manual cleanup completed successfully');
});

// POST /api/v1/chat/messages/:messageId/forward
export const forwardMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { targetConversationIds } = req.body;
  const { id: userId, name: userName, companyId, role } = req.user;

  // 1. Validate forward limit (max 5 conversations)
  if (!targetConversationIds || !Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'targetConversationIds array is required'
    });
  }

  if (targetConversationIds.length > 5) {
    return res.status(400).json({
      status: 'fail',
      message: 'Cannot forward to more than 5 conversations'
    });
  }

  // Fetch sender info for user context
  const forwardingUser = await getEmployeeInfo(userId, companyId);
  if (!forwardingUser) {
    return res.status(404).json({
      status: 'fail',
      message: 'User not found'
    });
  }

  // Call service to perform forwarding DB operations
  let newMessages;
  try {
    newMessages = await chatService.forwardMessage(
      messageId,
      targetConversationIds,
      {
        id: userId,
        name: forwardingUser.name || userName,
        avatar: forwardingUser.avatar || null,
        role: forwardingUser.roleId || role
      },
      companyId
    );
  } catch (error) {
    return res.status(400).json({
      status: 'fail',
      message: error.message || 'Failed to forward message'
    });
  }

  // Emit socket events and trigger notifications
  try {
    const io = getIO();
    const { queuePushNotification } = await import('./chat.socket.js');
    const conn = await getTenantConnection(companyId);

    for (const newMsg of newMessages) {
      const convId = newMsg.conversationId;
      const previewText = newMsg.type === 'text'
        ? newMsg.content
        : `📎 ${newMsg.media?.fileName || newMsg.type}`;

      // Emit new_message and message:new socket events to conversation room
      io.to(`conv:${convId}`).emit('message:new', {
        id: newMsg.id,
        conversationId: convId,
        senderId: userId,
        senderName: forwardingUser.name || userName,
        senderAvatar: forwardingUser.avatar || null,
        preview: previewText,
        type: newMsg.type,
        createdAt: newMsg.createdAt,
        _isOptimized: true,
        isForwarded: true,
        forwardedCount: newMsg.forwardedCount,
        forwardedFrom: newMsg.forwardedFrom
      });

      io.to(`conv:${convId}`).emit('message:new', newMsg);

      // Handle receipts + offline push notifications
      const conv = await Conversation.findOne({ id: convId }).lean();
      if (conv) {
        const otherParticipants = conv.participants.filter(
          p => p.employeeId !== userId
        );

        const otherParticipantIds = otherParticipants.map(p => p.employeeId);
        const employeesInfo = await conn.collection('employees').find(
          { id: { $in: otherParticipantIds } },
          { projection: { id: 1, chatStatus: 1 } }
        ).toArray();

        const employeeStatusMap = new Map(employeesInfo.map(e => [e.id, e.chatStatus]));

        // Fetch all socket IDs currently in the conversation room
        const roomSockets = await io
          .in(`conv:${convId}`)
          .fetchSockets();
        const usersInRoom = new Set(
          roomSockets.map(s => s.user?.id).filter(Boolean)
        );

        for (const participant of otherParticipants) {
          // Mark as delivered in DB
          await Message.updateOne(
            { id: newMsg.id },
            {
              $push: {
                deliveredTo: {
                  employeeId: participant.employeeId,
                  deliveredAt: new Date()
                }
              }
            }
          );

          // If not in room — send personal notification
          if (!usersInRoom.has(participant.employeeId)) {
            const targetSockets = await io.in(`user:${participant.employeeId}`).fetchSockets();
            if (targetSockets.length === 0) {
              const chatStatus = employeeStatusMap.get(participant.employeeId) || 'available';
              if (chatStatus !== 'dnd') {
                queuePushNotification(participant.employeeId, convId, companyId);
              }
            } else {
              // Emit notification alert for online user not in room
              io.to(`user:${participant.employeeId}`).emit('new_message_notification', {
                conversationId: convId,
                messageId: newMsg.id,
                senderName: forwardingUser.name || userName,
                preview: previewText
              });
            }
          }
        }
      }
    }
  } catch (err) {
    logger.error('[Chat Controller] Socket/notification dispatch failed for forward:', err.message);
  }

  return successResponse(res, newMessages, 'Messages forwarded successfully');
});


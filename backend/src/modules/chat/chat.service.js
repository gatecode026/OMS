/**
 * @file src/modules/chat/chat.service.js
 * @description Business logic for all chat operations — conversations,
 *   messages, reactions, group management. All operations are tenant-scoped
 *   via runWithTenant() to ensure cross-tenant isolation.
 */

import mongoose from 'mongoose';
import Conversation from './conversation.model.js';
import Message from './message.model.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import { runWithTenant } from '../../utils/tenantContext.js';
import { getIO } from '../../config/socket.js';
import { uploadToImageKit, deleteFromImageKit } from '../../utils/imagekit.js';

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────

/**
 * Get or create direct conversation between 2 users
 */
export const getOrCreateDirectConversation = async (
  user1, user2, companyId
) => {
  return runWithTenant(companyId, async () => {
    // Check existing direct conversation
    const existing = await Conversation.findOne({
      type: 'direct',
      'participants.employeeId': { $all: [user1.id, user2.id] }
    });

    if (existing) return { conversation: existing, isNew: false };

    // Create new direct conversation
    const convId = await generateCompanyUniqueId(companyId, 'conversations');

    const conversation = await Conversation.create({
      id: convId,
      companyId,
      type: 'direct',
      participants: [
        {
          employeeId: user1.id,
          name: user1.name,
          avatar: user1.avatar || null,
          role: user1.role || 'employee',
          joinedAt: new Date(),
          isAdmin: false
        },
        {
          employeeId: user2.id,
          name: user2.name,
          avatar: user2.avatar || null,
          role: user2.role || 'employee',
          joinedAt: new Date(),
          isAdmin: false
        }
      ],
      lastActivityAt: new Date()
    });

    return { conversation, isNew: true };
  });
};

/**
 * Create group conversation
 */
export const createGroupConversation = async (
  creatorUser, groupData, participantUsers, companyId
) => {
  return runWithTenant(companyId, async () => {
    const convId = await generateCompanyUniqueId(companyId, 'conversations');

    let avatarUrl = groupData.avatar || null;
    if (avatarUrl && avatarUrl.startsWith('data:') && avatarUrl.includes(';base64,')) {
      try {
        avatarUrl = await uploadToImageKit(avatarUrl, `group_avatar_${convId}_${Date.now()}.jpg`);
      } catch (err) {
        logger.error('[Chat] Group avatar upload failed:', err);
      }
    }

    // Creator is always admin
    const participants = [
      {
        employeeId: creatorUser.id,
        name: creatorUser.name,
        avatar: creatorUser.avatar || null,
        role: creatorUser.role || 'employee',
        joinedAt: new Date(),
        isAdmin: true,
        canAddMembers: true,
        canRemoveMembers: true
      },
      ...participantUsers.map(p => ({
        employeeId: p.id,
        name: p.name,
        avatar: p.avatar || null,
        role: p.role || 'employee',
        joinedAt: new Date(),
        isAdmin: false,
        canAddMembers: false,
        canRemoveMembers: false
      }))
    ];

    const conversation = await Conversation.create({
      id: convId,
      companyId,
      type: 'group',
      name: groupData.name.trim(),
      description: groupData.description || null,
      avatar: avatarUrl,
      createdBy: creatorUser.id,
      participants,
      lastActivityAt: new Date(),
      settings: {
        onlyAdminsCanMessage: false,
        onlyAdminsCanEditInfo: true
      }
    });

    // System message: "John created group XYZ"
    const msgId = await generateCompanyUniqueId(companyId, 'messages');
    await Message.create({
      id: msgId,
      companyId,
      conversationId: convId,
      senderId: 'system',
      senderName: 'System',
      content: `${creatorUser.name} created group "${groupData.name}"`,
      type: 'system',
      systemMeta: {
        action: 'group_created',
        targetId: creatorUser.id,
        targetName: creatorUser.name
      }
    });

    return conversation;
  });
};

/**
 * Get all conversations for a user (WhatsApp style — sorted by last activity)
 */
export const getUserConversations = async (employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const conversations = await Conversation.find({
      'participants.employeeId': employeeId,
      isActive: true
    })
      .sort({ lastActivityAt: -1 })
      .lean();

    // Add unread count for each conversation
    const convsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find(
          p => p.employeeId === employeeId
        );
        const lastReadAt = participant?.lastReadAt || new Date(0);

        const unreadCount = await Message.countDocuments({
          conversationId: conv.id,
          senderId: { $ne: employeeId },
          isDeleted: false,
          createdAt: { $gt: lastReadAt }
        });

        return { ...conv, unreadCount };
      })
    );

    return convsWithUnread;
  });
};

/**
 * Get paginated messages for a conversation
 */
export const getMessages = async (
  conversationId, employeeId, companyId,
  cursor = null, limit = 50
) => {
  return runWithTenant(companyId, async () => {
    // Verify participant
    const conv = await Conversation.findOne({
      id: conversationId,
      'participants.employeeId': employeeId
    });
    if (!conv) throw new Error('Conversation not found or access denied');

    const query = {
      conversationId,
      $nor: [{ 'deletedFor.employeeId': employeeId }]
    };

    if (cursor && mongoose.isValidObjectId(cursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .lean();

    // Reverse for chronological order (newest last — WhatsApp style)
    messages.reverse();

    const nextCursor = messages.length > 0 ? messages[0]._id.toString() : null;

    let hasMore = false;
    if (nextCursor) {
      const moreCount = await Message.countDocuments({
        conversationId,
        $nor: [{ 'deletedFor.employeeId': employeeId }],
        _id: { $lt: new mongoose.Types.ObjectId(nextCursor) }
      });
      hasMore = moreCount > 0;
    }

    return {
      messages,
      pagination: {
        cursor: nextCursor,
        limit,
        hasMore
      },
      conversation: conv
    };
  });
};

/**
 * Get single message detail
 */
export const getMessageDetail = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const message = await Message.findOne({
      id: messageId,
      $nor: [{ 'deletedFor.employeeId': employeeId }]
    }).lean();

    if (!message) throw new Error('Message not found');

    // Verify participant
    const conv = await Conversation.findOne({
      id: message.conversationId,
      'participants.employeeId': employeeId
    });
    if (!conv) throw new Error('Access denied');

    return message;
  });
};

/**
 * Save message to DB (called by Socket.io handler)
 */
export const saveMessage = async (messageData, companyId) => {
  return runWithTenant(companyId, async () => {
    // Enforce onlyAdminsCanMessage settings
    const conv = await Conversation.findOne({ id: messageData.conversationId });
    if (!conv) throw new Error('Conversation not found');

    if (conv.type === 'group' && conv.settings?.onlyAdminsCanMessage) {
      const participant = conv.participants.find(p => p.employeeId === messageData.senderId);
      if (!participant?.isAdmin) {
        throw new Error('Only admins can send messages in this group');
      }
    }

    const msgId = await generateCompanyUniqueId(companyId, 'messages');

    let replyToObject = null;
    if (messageData.replyTo && typeof messageData.replyTo === 'string') {
      const originalMsg = await Message.findOne({ id: messageData.replyTo });
      if (originalMsg) {
        replyToObject = {
          messageId: originalMsg.id,
          content: originalMsg.content || '',
          senderId: originalMsg.senderId,
          senderName: originalMsg.senderName,
          type: originalMsg.type || 'text',
          mediaUrl: originalMsg.media?.url || null
        };
      }
    } else if (messageData.replyTo && typeof messageData.replyTo === 'object') {
      replyToObject = messageData.replyTo;
    }

    const message = await Message.create({
      id: msgId,
      companyId,
      ...messageData,
      replyTo: replyToObject
    });

    // Update conversation lastMessage + lastActivityAt
    const previewContent = messageData.isDeleted
      ? null
      : messageData.type === 'text'
        ? messageData.content
        : `📎 ${messageData.media?.fileName || messageData.type}`;

    await Conversation.findOneAndUpdate(
      { id: messageData.conversationId },
      {
        lastMessage: {
          messageId: msgId,
          content: previewContent,
          type: messageData.type,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          sentAt: new Date()
        },
        lastActivityAt: new Date()
      }
    );

    return message;
  });
};

/**
 * Mark messages as read — WhatsApp blue tick
 */
export const markAsRead = async (
  conversationId, employeeId, employeeName, companyId
) => {
  return runWithTenant(companyId, async () => {
    const now = new Date();

    // Add readBy to all unread messages in this conversation
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: employeeId },
        isDeleted: false,
        'readBy.employeeId': { $ne: employeeId }
      },
      {
        $push: {
          readBy: { employeeId, name: employeeName, readAt: now }
        }
      }
    );

    // Update participant's lastReadAt
    await Conversation.findOneAndUpdate(
      {
        id: conversationId,
        'participants.employeeId': employeeId
      },
      {
        $set: {
          'participants.$.lastReadAt': now
        }
      }
    );

    return { success: true, readAt: now };
  });
};

/**
 * Delete message — for me only OR for everyone
 */
export const deleteMessage = async (
  messageId, employeeId, deleteForEveryone, companyId
) => {
  return runWithTenant(companyId, async () => {
    const message = await Message.findOne({ id: messageId });
    if (!message) throw new Error('Message not found');

    if (deleteForEveryone) {
      // Only sender can delete for everyone
      if (message.senderId !== employeeId) {
        throw new Error('Only sender can delete message for everyone');
      }
      // Check time limit (WhatsApp: 60 hours)
      const hoursDiff = (Date.now() - message.createdAt) / (1000 * 60 * 60);
      if (hoursDiff > 60) {
        throw new Error('Cannot delete message after 60 hours');
      }

      await Message.findOneAndUpdate(
        { id: messageId },
        {
          isDeleted: true,
          deletedAt: new Date(),
          content: '',
          media: null
        }
      );
    } else {
      // Delete for me only
      await Message.findOneAndUpdate(
        { id: messageId },
        {
          $push: {
            deletedFor: { employeeId, deletedAt: new Date() }
          }
        }
      );
    }

    return { success: true, deleteForEveryone };
  });
};

/**
 * Add reaction to message (WhatsApp emoji reactions)
 */
export const addReaction = async (
  messageId, employeeId, employeeName, emoji, companyId
) => {
  return runWithTenant(companyId, async () => {
    // Remove existing reaction from same user first (toggle)
    await Message.findOneAndUpdate(
      { id: messageId },
      { $pull: { reactions: { employeeId } } }
    );

    // Add new reaction
    await Message.findOneAndUpdate(
      { id: messageId },
      {
        $push: {
          reactions: {
            employeeId,
            name: employeeName,
            emoji,
            reactedAt: new Date()
          }
        }
      }
    );

    return { success: true };
  });
};

/**
 * Edit message
 */
export const editMessage = async (
  messageId, employeeId, newContent, companyId
) => {
  return runWithTenant(companyId, async () => {
    const message = await Message.findOne({ id: messageId });
    if (!message) throw new Error('Message not found');
    if (message.senderId !== employeeId)
      throw new Error('Only sender can edit message');
    if (message.type !== 'text')
      throw new Error('Only text messages can be edited');

    await Message.findOneAndUpdate(
      { id: messageId },
      {
        content: newContent,
        isEdited: true,
        editedAt: new Date(),
        $push: {
          editHistory: {
            content: message.content,
            editedAt: new Date()
          }
        }
      }
    );

    return { success: true };
  });
};

/**
 * Search messages in a conversation
 */
export const searchMessages = async (
  conversationId, query, employeeId, companyId
) => {
  return runWithTenant(companyId, async () => {
    const messages = await Message.find({
      conversationId,
      content: { $regex: query, $options: 'i' },
      isDeleted: false,
      $nor: [{ 'deletedFor.employeeId': employeeId }]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return messages;
  });
};

/**
 * Add members to group
 */
export const addGroupMembers = async (
  conversationId, adminId, newMembers, companyId
) => {
  return runWithTenant(companyId, async () => {
    const conv = await Conversation.findOne({ id: conversationId });
    if (!conv || conv.type !== 'group')
      throw new Error('Group not found');

    const adminParticipant = conv.participants.find(
      p => p.employeeId === adminId
    );
    if (!adminParticipant?.isAdmin)
      throw new Error('Only admins can add members');

    const validNewMembers = [];
    const addedNames = [];

    for (const member of newMembers) {
      const exists = conv.participants.find(p => p.employeeId === member.id);
      if (!exists) {
        validNewMembers.push({
          employeeId: member.id,
          name: member.name,
          avatar: member.avatar || null,
          joinedAt: new Date(),
          isAdmin: false
        });
        addedNames.push(member.name);
      }
    }

    if (validNewMembers.length === 0) {
      return { success: true, addedMembers: [], conversation: conv };
    }

    // Push all new participants in one operation
    const conversation = await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $push: { participants: { $each: validNewMembers } } },
      { new: true }
    ).lean();

    // Create a single batched system message
    let content = '';
    if (addedNames.length === 1) {
      content = `${adminParticipant.name} added ${addedNames[0]}`;
    } else if (addedNames.length === 2) {
      content = `${adminParticipant.name} added ${addedNames[0]} and ${addedNames[1]}`;
    } else {
      content = `${adminParticipant.name} added ${addedNames[0]}, ${addedNames[1]} and ${addedNames.length - 2} others`;
    }

    const msgId = await generateCompanyUniqueId(companyId, 'messages');
    const sysMsg = await Message.create({
      id: msgId,
      companyId,
      conversationId,
      senderId: 'system',
      senderName: 'System',
      content,
      type: 'system',
      systemMeta: {
        action: 'member_added',
        targetId: validNewMembers[0].employeeId,
        targetName: addedNames.join(', ')
      }
    });

    // Broadcast system message to active sockets in room
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit('new_message', {
        id: msgId,
        conversationId,
        senderId: 'system',
        senderName: 'System',
        preview: sysMsg.content,
        type: 'system',
        createdAt: sysMsg.createdAt,
        _isOptimized: true
      });
    } catch (err) {}

    return { success: true, addedMembers: addedNames, conversation };
  });
};

/**
 * Remove member from group / Leave group
 */
export const removeGroupMember = async (
  conversationId, adminId, targetEmployeeId, companyId
) => {
  return runWithTenant(companyId, async () => {
    const conv = await Conversation.findOne({ id: conversationId });
    if (!conv || conv.type !== 'group')
      throw new Error('Group not found');

    const isSelf = adminId === targetEmployeeId;
    let adminParticipant = null;
    if (!isSelf) {
      adminParticipant = conv.participants.find(
        p => p.employeeId === adminId
      );
      if (!adminParticipant?.isAdmin)
        throw new Error('Only admins can remove members');
    }

    const target = conv.participants.find(
      p => p.employeeId === targetEmployeeId
    );
    if (!target) throw new Error('Member not found in group');

    // Auto-promote logic if the leaving user is the last admin
    let autoPromotedMsg = null;
    let autoPromotedMemberId = null;

    if (target.isAdmin) {
      const admins = conv.participants.filter(p => p.isAdmin);
      if (admins.length === 1) {
        const otherParticipants = conv.participants.filter(
          p => p.employeeId !== targetEmployeeId
        );
        if (otherParticipants.length > 0) {
          // Sort by joinedAt ascending to find the longest standing member
          otherParticipants.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
          const longestStanding = otherParticipants[0];
          autoPromotedMemberId = longestStanding.employeeId;

          // Promote them in DB
          await Conversation.findOneAndUpdate(
            { id: conversationId, 'participants.employeeId': longestStanding.employeeId },
            { $set: { 'participants.$.isAdmin': true } }
          );

          autoPromotedMsg = `${longestStanding.name} has been promoted to Admin (auto-promoted)`;
        }
      }
    }

    const action = isSelf ? 'member_left' : 'member_removed';
    const content = isSelf
      ? `${target.name} left the group`
      : `${adminParticipant ? adminParticipant.name : 'Admin'} removed ${target.name}`;

    // Pull member out
    const updatedConv = await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $pull: { participants: { employeeId: targetEmployeeId } } },
      { new: true }
    ).lean();

    // Create system message for leave/remove
    const msgId = await generateCompanyUniqueId(companyId, 'messages');
    const sysMsg = await Message.create({
      id: msgId,
      companyId,
      conversationId,
      senderId: 'system',
      senderName: 'System',
      content,
      type: 'system',
      systemMeta: {
        action,
        targetId: targetEmployeeId,
        targetName: target.name
      }
    });

    // Broadcast leave/remove system message
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit('new_message', {
        id: sysMsg.id,
        conversationId,
        senderId: 'system',
        senderName: 'System',
        preview: sysMsg.content,
        type: 'system',
        createdAt: sysMsg.createdAt,
        _isOptimized: true
      });
    } catch (err) {}

    // Create and broadcast auto-promote system message if applicable
    if (autoPromotedMsg) {
      const pMsgId = await generateCompanyUniqueId(companyId, 'messages');
      const pSysMsg = await Message.create({
        id: pMsgId,
        companyId,
        conversationId,
        senderId: 'system',
        senderName: 'System',
        content: autoPromotedMsg,
        type: 'system',
        systemMeta: {
          action: 'admin_added',
          targetId: autoPromotedMemberId,
          targetName: autoPromotedMsg.split(' has been')[0]
        }
      });

      try {
        const io = getIO();
        io.to(`conv:${conversationId}`).emit('new_message', {
          id: pSysMsg.id,
          conversationId,
          senderId: 'system',
          senderName: 'System',
          preview: pSysMsg.content,
          type: 'system',
          createdAt: pSysMsg.createdAt,
          _isOptimized: true
        });
      } catch (err) {}
    }

    return { success: true, conversation: updatedConv };
  });
};

/**
 * Update group details (name, description, avatar, settings)
 */
export const updateGroupDetails = async (conversationId, adminId, groupData, companyId) => {
  return runWithTenant(companyId, async () => {
    const conv = await Conversation.findOne({ id: conversationId });
    if (!conv || conv.type !== 'group') throw new Error('Group not found');

    const adminParticipant = conv.participants.find(p => p.employeeId === adminId);
    if (!adminParticipant?.isAdmin) throw new Error('Only admins can update group details');

    const updates = {};
    const systemMessages = [];

    // 0. Promote Member to Admin
    if (groupData.promoteEmployeeId) {
      const target = conv.participants.find(p => p.employeeId === groupData.promoteEmployeeId);
      if (target && !target.isAdmin) {
        await Conversation.findOneAndUpdate(
          { id: conversationId, 'participants.employeeId': groupData.promoteEmployeeId },
          { $set: { 'participants.$.isAdmin': true } }
        );
        systemMessages.push(`${adminParticipant.name} promoted ${target.name} to Admin`);
      }
    }

    // 1. Name update
    if (groupData.name && groupData.name.trim() !== conv.name) {
      updates.name = groupData.name.trim();
      systemMessages.push(`${adminParticipant.name} changed the group name to "${updates.name}"`);
    }

    // 2. Description update
    if (groupData.description !== undefined && groupData.description !== conv.description) {
      updates.description = groupData.description || null;
    }

    // 3. Avatar update with ImageKit old file deletion
    if (groupData.avatar !== undefined && groupData.avatar !== conv.avatar) {
      let newAvatarUrl = groupData.avatar || null;
      if (newAvatarUrl && newAvatarUrl.startsWith('data:') && newAvatarUrl.includes(';base64,')) {
        newAvatarUrl = await uploadToImageKit(newAvatarUrl, `group_avatar_${conversationId}_${Date.now()}.jpg`);
      }

      const oldAvatar = conv.avatar;
      updates.avatar = newAvatarUrl;

      if (oldAvatar && oldAvatar.includes('imagekit.io')) {
        deleteFromImageKit(oldAvatar).catch(err => {
          logger.error('[ImageKit] Failed to delete old avatar:', err);
        });
      }

      systemMessages.push(`${adminParticipant.name} changed the group profile photo`);
    }

    // 4. Settings update
    if (groupData.settings) {
      updates.settings = {
        ...conv.settings,
        ...groupData.settings
      };
      if (groupData.settings.onlyAdminsCanMessage !== undefined && groupData.settings.onlyAdminsCanMessage !== conv.settings?.onlyAdminsCanMessage) {
        const settingText = groupData.settings.onlyAdminsCanMessage ? 'Admins Only' : 'All Participants';
        systemMessages.push(`${adminParticipant.name} set group messages setting to: ${settingText}`);
      }
    }

    if (Object.keys(updates).length === 0) return conv;

    const updatedConv = await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $set: updates },
      { new: true }
    );

    // Write system messages
    for (const content of systemMessages) {
      const msgId = await generateCompanyUniqueId(companyId, 'messages');
      const sysMsg = await Message.create({
        id: msgId,
        companyId,
        conversationId,
        senderId: 'system',
        senderName: 'System',
        content,
        type: 'system'
      });

      // Broadcast system message
      try {
        const io = getIO();
        io.to(`conv:${conversationId}`).emit('new_message', {
          id: sysMsg.id,
          conversationId,
          senderId: 'system',
          senderName: 'System',
          preview: sysMsg.content,
          type: 'system',
          createdAt: sysMsg.createdAt,
          _isOptimized: true
        });
      } catch (err) {}
    }

    return updatedConv;
  });
};

/**
 * Pin a conversation for a specific employee
 */
export const pinConversation = async (conversationId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $addToSet: { pinnedBy: { employeeId, pinnedAt: new Date() } } },
      { new: true }
    );
  });
};

/**
 * Unpin a conversation for a specific employee
 */
export const unpinConversation = async (conversationId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Conversation.findOneAndUpdate(
      { id: conversationId },
      { $pull: { pinnedBy: { employeeId } } },
      { new: true }
    );
  });
};

/**
 * Pin a message in a conversation
 */
export const pinMessage = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.findOneAndUpdate(
      { id: messageId },
      { isPinned: true, pinnedBy: employeeId, pinnedAt: new Date() },
      { new: true }
    );
  });
};

/**
 * Unpin a message in a conversation
 */
export const unpinMessage = async (messageId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.findOneAndUpdate(
      { id: messageId },
      { isPinned: false, pinnedBy: null, pinnedAt: null },
      { new: true }
    );
  });
};

/**
 * Star/Highlight a message for a specific employee
 */
export const starMessage = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.findOneAndUpdate(
      { id: messageId },
      { $addToSet: { starredBy: employeeId } },
      { new: true }
    );
  });
};

/**
 * Unstar/Unhighlight a message for a specific employee
 */
export const unstarMessage = async (messageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    return await Message.findOneAndUpdate(
      { id: messageId },
      { $pull: { starredBy: employeeId } },
      { new: true }
    );
  });
};


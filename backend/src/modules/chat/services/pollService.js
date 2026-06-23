/**
 * @file src/modules/chat/services/pollService.js
 * @description Core business logic for multi-tenant chat polling.
 */

import mongoose from 'mongoose';
import Poll from '../models/Poll.js';
import Message from '../message.model.js';
import Conversation from '../conversation.model.js';
import ActivityLog from '../../activity-logs/activity-log.model.js';
import Notification from '../../notifications/notification.model.js';
import { generateCompanyUniqueId } from '../../../utils/idGenerator.js';
import { runWithTenant } from '../../../utils/tenantContext.js';
import { getIO } from '../../../config/socket.js';
import logger from '../../../config/logger.js';

/**
 * Write to multi-tenant Activity / Audit log
 */
export const logPollActivity = async (companyId, { actor, actionType, fieldChanged, oldValue, newValue }) => {
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
    logger.error('[PollService] Failed to write ActivityLog:', err);
  }
};

/**
 * Create system in-app Notification for a user
 */
const createInAppNotification = async (companyId, { title, message, forUserId, sentBy }) => {
  try {
    const notifId = await generateCompanyUniqueId(companyId, 'notifications');
    await Notification.create({
      id: notifId,
      companyId,
      type: 'poll',
      title,
      message,
      time: new Date().toISOString(),
      read: false,
      category: 'poll',
      priority: 'Normal',
      forUserId,
      recipientId: forUserId,
      sentBy,
      sentDate: new Date().toISOString()
    });
  } catch (err) {
    logger.error('[PollService] Failed to create Notification record:', err);
  }
};

/**
 * Create a new Poll
 */
export const createPoll = async (pollData, creator, companyId) => {
  return runWithTenant(companyId, async () => {
    const { question, options, allowMultipleVotes, isAnonymous, expiresAt, conversationId, threadId } = pollData;

    // Validate options count
    if (!options || options.length < 2 || options.length > 20) {
      throw new Error('Poll must have between 2 and 20 options');
    }

    // Verify conversation exists and user is participant
    const conv = await Conversation.findOne({
      id: conversationId,
      'participants.employeeId': creator.id
    });
    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    // Map options to schema layout
    const formattedOptions = options.map(txt => ({
      optionId: new mongoose.Types.ObjectId(),
      text: txt.trim(),
      votes: []
    }));

    // Create Poll document
    const poll = await Poll.create({
      companyId,
      question: question.trim(),
      options: formattedOptions,
      allowMultipleVotes: !!allowMultipleVotes,
      isAnonymous: !!isAnonymous,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isClosed: false,
      createdBy: creator.id,
      conversationId,
      threadId: threadId ? new mongoose.Types.ObjectId(threadId) : null,
      totalVotes: 0
    });

    // Create Message representation of type 'poll'
    const msgId = await generateCompanyUniqueId(companyId, 'messages');
    const message = await Message.create({
      id: msgId,
      companyId,
      conversationId,
      senderId: creator.id,
      senderName: creator.name,
      senderAvatar: creator.avatar || null,
      senderRole: creator.role || 'employee',
      content: `📊 Poll: ${question.trim()}`,
      type: 'poll',
      pollId: poll._id,
      threadId: threadId ? new mongoose.Types.ObjectId(threadId) : null,
      isThreadReply: !!threadId
    });

    // Update conversation last activity & preview
    await Conversation.findOneAndUpdate(
      { id: conversationId },
      {
        lastMessage: {
          messageId: msgId,
          content: `📊 Poll: ${question.trim()}`,
          type: 'text',
          senderId: creator.id,
          senderName: creator.name,
          sentAt: new Date()
        },
        lastActivityAt: new Date()
      }
    );

    // Emit via Socket.io
    try {
      const io = getIO();
      // Hydrate message with full pollId document details for UI render
      const hydratedMessage = message.toObject();
      hydratedMessage.pollId = poll.toObject();

      io.to(`conv:${conversationId}`).emit('new_message', {
        id: msgId,
        conversationId,
        senderId: creator.id,
        senderName: creator.name,
        senderAvatar: creator.avatar,
        preview: `📊 Poll: ${question.trim()}`,
        type: 'poll',
        createdAt: message.createdAt,
        pollId: poll.toObject(),
        threadId: message.threadId,
        isThreadReply: message.isThreadReply
      });

      io.to(`conv:${conversationId}`).emit('message:new', hydratedMessage);
      io.to(`conv:${conversationId}`).emit('poll:created', poll);

      // System notification fanout for other participants
      const otherParticipants = conv.participants.filter(p => p.employeeId !== creator.id);
      for (const p of otherParticipants) {
        // Create in-app system notification
        await createInAppNotification(companyId, {
          title: 'New Poll Created',
          message: `${creator.name} created a new poll: "${question.trim()}"`,
          forUserId: p.employeeId,
          sentBy: creator.id
        });

        // Push real-time event alert
        io.to(`user:${p.employeeId}`).emit('new_message_notification', {
          conversationId,
          messageId: msgId,
          senderName: creator.name,
          preview: `📊 New Poll: ${question.trim()}`
        });
      }
    } catch (socketErr) {
      logger.warn('[PollService] Socket notify failed during poll creation:', socketErr.message);
    }

    // Write audit log
    await logPollActivity(companyId, {
      actor: creator.name,
      actionType: 'poll_created',
      fieldChanged: 'poll',
      newValue: question.trim()
    });

    return { poll, message };
  });
};

/**
 * Cast a vote on a poll option
 */
export const castVote = async (pollId, optionId, voterId, voterName, companyId) => {
  return runWithTenant(companyId, async () => {
    const poll = await Poll.findById(pollId);
    if (!poll) throw new Error('Poll not found');

    if (poll.isClosed) {
      throw new Error('This poll has been closed');
    }

    if (poll.expiresAt && new Date(poll.expiresAt) <= new Date()) {
      poll.isClosed = true;
      await poll.save();
      throw new Error('This poll has expired and is closed');
    }

    // Check if voter is a participant in the conversation
    const conv = await Conversation.findOne({
      id: poll.conversationId,
      'participants.employeeId': voterId
    });
    if (!conv) {
      throw new Error('Access denied: You are not a member of this conversation');
    }

    // Locate target option
    const option = poll.options.find(opt => opt.optionId.toString() === optionId.toString());
    if (!option) throw new Error('Option not found');

    const hasVotedThisOption = option.votes.includes(voterId);

    if (poll.allowMultipleVotes) {
      // Toggle vote on this option
      if (hasVotedThisOption) {
        option.votes = option.votes.filter(v => v !== voterId);
      } else {
        option.votes.push(voterId);
      }
    } else {
      // Single choice voting rules: clear user's votes from ALL other options first
      poll.options.forEach(opt => {
        if (opt.optionId.toString() !== optionId.toString()) {
          opt.votes = opt.votes.filter(v => v !== voterId);
        }
      });

      // Toggle this option
      if (hasVotedThisOption) {
        option.votes = option.votes.filter(v => v !== voterId);
      } else {
        option.votes.push(voterId);
      }
    }

    // Recalculate total votes (count unique voters)
    const uniqueVoters = new Set();
    poll.options.forEach(opt => {
      opt.votes.forEach(v => uniqueVoters.add(v));
    });
    poll.totalVotes = uniqueVoters.size;

    await poll.save();

    // Broadcast poll update
    try {
      const io = getIO();
      io.to(`conv:${poll.conversationId}`).emit('poll:voted', poll);
      io.to(`conv:${poll.conversationId}`).emit('poll:updated', poll);
    } catch (socketErr) {
      logger.warn('[PollService] Socket broadcast failed during vote cast:', socketErr.message);
    }

    // Write audit log
    await logPollActivity(companyId, {
      actor: voterName,
      actionType: 'poll_vote_cast',
      fieldChanged: 'votes',
      newValue: `Option: ${option.text}`
    });

    return poll;
  });
};

/**
 * Close a poll manually
 */
export const closePoll = async (pollId, userId, userName, companyId, userRole) => {
  return runWithTenant(companyId, async () => {
    const poll = await Poll.findById(pollId);
    if (!poll) throw new Error('Poll not found');

    // Only creator or admin can close
    if (poll.createdBy !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      throw new Error('Access denied: Only the creator or administrator can close this poll');
    }

    poll.isClosed = true;
    await poll.save();

    // Broadcast close event
    try {
      const io = getIO();
      io.to(`conv:${poll.conversationId}`).emit('poll:closed', poll);
      io.to(`conv:${poll.conversationId}`).emit('poll:updated', poll);

      // System notification to conversation members
      const conv = await Conversation.findOne({ id: poll.conversationId });
      if (conv) {
        const activeMembers = conv.participants.filter(p => p.employeeId !== userId);
        for (const m of activeMembers) {
          await createInAppNotification(companyId, {
            title: 'Poll Closed',
            message: `The poll: "${poll.question}" has been closed by ${userName}`,
            forUserId: m.employeeId,
            sentBy: userId
          });
        }
      }
    } catch (socketErr) {
      logger.warn('[PollService] Socket broadcast failed during poll close:', socketErr.message);
    }

    // Write audit log
    await logPollActivity(companyId, {
      actor: userName,
      actionType: 'poll_closed',
      fieldChanged: 'isClosed',
      newValue: 'true'
    });

    return poll;
  });
};

/**
 * Reopen a closed poll
 */
export const reopenPoll = async (pollId, userId, userName, companyId, userRole) => {
  return runWithTenant(companyId, async () => {
    const poll = await Poll.findById(pollId);
    if (!poll) throw new Error('Poll not found');

    // Only creator or admin can reopen
    if (poll.createdBy !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      throw new Error('Access denied: Only the creator or administrator can reopen this poll');
    }

    poll.isClosed = false;
    await poll.save();

    // Broadcast reopen event
    try {
      const io = getIO();
      io.to(`conv:${poll.conversationId}`).emit('poll:reopened', poll);
      io.to(`conv:${poll.conversationId}`).emit('poll:updated', poll);
    } catch (socketErr) {
      logger.warn('[PollService] Socket broadcast failed during poll reopen:', socketErr.message);
    }

    // Write audit log
    await logPollActivity(companyId, {
      actor: userName,
      actionType: 'poll_reopened',
      fieldChanged: 'isClosed',
      newValue: 'false'
    });

    return poll;
  });
};

/**
 * Delete a poll
 */
export const deletePoll = async (pollId, userId, userName, companyId, userRole) => {
  return runWithTenant(companyId, async () => {
    const poll = await Poll.findById(pollId);
    if (!poll) throw new Error('Poll not found');

    // Only creator or admin can delete
    if (poll.createdBy !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      throw new Error('Access denied: Only the creator or administrator can delete this poll');
    }

    const conversationId = poll.conversationId;

    // Delete matching Poll document
    await Poll.findByIdAndDelete(pollId);

    // Delete corresponding Message document
    await Message.findOneAndDelete({ pollId: poll._id });

    // Broadcast delete event
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit('poll:deleted', { pollId });
    } catch (socketErr) {
      logger.warn('[PollService] Socket broadcast failed during poll delete:', socketErr.message);
    }

    // Write audit log
    await logPollActivity(companyId, {
      actor: userName,
      actionType: 'poll_deleted',
      fieldChanged: 'poll',
      newValue: poll.question
    });

    return { success: true };
  });
};

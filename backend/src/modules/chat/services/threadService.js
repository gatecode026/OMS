/**
 * @file src/modules/chat/services/threadService.js
 * @description Core business logic for Slack-style threaded chat conversations.
 *   Enforces multi-tenant workspace separation and user permissions.
 */

import mongoose from 'mongoose';
import Thread from '../models/Thread.js';
import Message from '../message.repository.js';
import Conversation from '../conversation.repository.js';
import Employee from '../../employees/employees.model.js';
import { runWithTenant } from '../../../utils/tenantContext.js';
import { generateCompanyUniqueId } from '../../../utils/idGenerator.js';
import { getIO } from '../../../config/socket.js';
import logger from '../../../config/logger.js';
import { detectMarkdown } from '../chat.service.js';

/**
 * Helper to fetch employee details (names, avatars) for a list of employeeIds
 */
const resolveEmployeeDetails = async (employeeIds, companyId) => {
  return runWithTenant(companyId, async () => {
    const employees = await Employee.find({ id: { $in: employeeIds } }).lean();
    return employees.reduce((acc, emp) => {
      acc[emp.id] = {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar || null
      };
      return acc;
    }, {});
  });
};

/**
 * Creates a Thread from a root message if one does not already exist.
 */
export const createThread = async (rootMessageId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    // 1. Fetch root message
    const message = await Message.findOne({ id: rootMessageId });
    if (!message) {
      throw new Error('Message not found');
    }

    // 2. Validate conversation access
    const conv = await Conversation.findOne({
      id: message.conversationId,
      'participants.employeeId': employeeId
    });
    if (!conv) {
      throw new Error('Access denied: You are not a participant in this conversation');
    }

    // 3. Check if thread already exists for this root message
    let thread = await Thread.findOne({ rootMessageId });
    if (thread) {
      return thread;
    }

    // 4. Create new Thread document
    thread = await Thread.create({
      rootMessageId,
      conversationId: message.conversationId,
      participants: [employeeId],
      followers: [employeeId],
      createdBy: employeeId,
      replyCount: 0,
      lastReplyAt: new Date(),
      readStates: [{ employeeId, lastReadAt: new Date(), unreadCount: 0 }]
    });

    // 5. Update root message to point to the thread
    message.threadId = thread._id;
    await message.save();

    // Broadcast update to the conversation room so client updates its UI
    try {
      const io = getIO();
      io.to(`conv:${message.conversationId}`).emit('thread:updated', {
        threadId: thread._id,
        rootMessageId,
        replyCount: 0,
        lastReplyAt: thread.lastReplyAt,
        status: thread.status,
        participants: [employeeId]
      });
    } catch (e) {
      logger.warn('[ThreadService] Socket broadcast failed during thread creation:', e.message);
    }

    return thread;
  });
};

/**
 * Retrieves thread metadata, participants, and follower details.
 */
export const getThreadDetails = async (threadId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const thread = await Thread.findById(threadId).lean();
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Validate access to the conversation
    const conv = await Conversation.findOne({
      id: thread.conversationId,
      'participants.employeeId': employeeId
    });
    if (!conv) {
      throw new Error('Access denied');
    }

    // Resolve employee details for participants and followers
    const allUserIds = Array.from(new Set([...thread.participants, ...thread.followers, thread.createdBy]));
    const employeeMap = await resolveEmployeeDetails(allUserIds, companyId);

    // Fetch root message details
    const rootMessage = await Message.findOne({ id: thread.rootMessageId }, { lean: true });
    if (rootMessage && rootMessage.type === 'poll' && rootMessage.pollId) {
      const Poll = mongoose.model('Poll');
      let poll = await Poll.findById(rootMessage.pollId).lean();
      if (poll) {
        const now = new Date();
        if (!poll.isClosed && poll.expiresAt && new Date(poll.expiresAt) <= now) {
          poll.isClosed = true;
          await Poll.findByIdAndUpdate(poll._id, { $set: { isClosed: true } });
        }
        if (poll.isAnonymous) {
          poll = {
            ...poll,
            options: poll.options.map(opt => ({
              optionId: opt.optionId,
              text: opt.text,
              votesCount: opt.votes.length,
              votes: []
            }))
          };
        }
        rootMessage.pollId = poll;
      }
    }

    return {
      ...thread,
      rootMessage,
      createdByDetails: employeeMap[thread.createdBy] || { id: thread.createdBy, name: 'Unknown User' },
      participantsDetails: thread.participants.map(p => employeeMap[p] || { id: p, name: 'Unknown User' }),
      followersDetails: thread.followers.map(f => employeeMap[f] || { id: f, name: 'Unknown User' })
    };
  });
};

/**
 * Retrieves replies of a thread using cursor-based pagination.
 */
export const getThreadReplies = async (threadId, employeeId, companyId, queryOptions = {}) => {
  return runWithTenant(companyId, async () => {
    const thread = await Thread.findById(threadId).lean();
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Validate access
    const conv = await Conversation.findOne({
      id: thread.conversationId,
      'participants.employeeId': employeeId
    });
    if (!conv) {
      throw new Error('Access denied');
    }

    const limit = Math.max(1, parseInt(queryOptions.limit) || 20);
    const { cursor } = queryOptions;

    // Build pagination query
    const query = {
      threadId: new mongoose.Types.ObjectId(threadId),
      isThreadReply: true,
      isDeleted: { $ne: true }
    };

    if (cursor) {
      query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
    }

    // Fetch replies in chronological order (oldest first)
    const replies = await Message.find(query, { sort: { _id: 1 }, limit: limit + 1, lean: true });

    const pollIds = replies.filter(m => m.type === 'poll' && m.pollId).map(m => m.pollId);
    if (pollIds.length > 0) {
      const Poll = mongoose.model('Poll');
      const polls = await Poll.find({ _id: { $in: pollIds } }).lean();
      const now = new Date();
      const expiredPollIds = [];
      const updatedPolls = polls.map(p => {
        if (!p.isClosed && p.expiresAt && new Date(p.expiresAt) <= now) {
          p.isClosed = true;
          expiredPollIds.push(p._id);
        }
        return p;
      });
      if (expiredPollIds.length > 0) {
        await Poll.updateMany(
          { _id: { $in: expiredPollIds } },
          { $set: { isClosed: true } }
        );
      }
      const pollMap = updatedPolls.reduce((acc, p) => {
        if (p.isAnonymous) {
          p = {
            ...p,
            options: p.options.map(opt => ({
              optionId: opt.optionId,
              text: opt.text,
              votesCount: opt.votes.length,
              votes: []
            }))
          };
        }
        acc[p._id.toString()] = p;
        return acc;
      }, {});
      replies.forEach(m => {
        if (m.type === 'poll' && m.pollId && pollMap[m.pollId.toString()]) {
          m.pollId = pollMap[m.pollId.toString()];
        }
      });
    }

    const hasMore = replies.length > limit;
    if (hasMore) {
      replies.pop();
    }

    const nextCursor = replies.length > 0 ? replies[replies.length - 1]._id.toString() : null;

    return {
      replies,
      pagination: {
        cursor: nextCursor,
        limit,
        hasMore
      }
    };
  });
};

/**
 * Sends a reply inside a thread.
 */
export const sendThreadReply = async (threadId, senderId, senderName, senderAvatar, senderRole, replyData, companyId) => {
  return runWithTenant(companyId, async () => {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Validate access
    const conv = await Conversation.findOne({
      id: thread.conversationId,
      'participants.employeeId': senderId
    });
    if (!conv) {
      throw new Error('Access denied');
    }

    if (thread.status === 'closed') {
      throw new Error('Thread is closed for replies');
    }

    const { content, type = 'text', media = null, tempId = null } = replyData;

    // Generate unique message ID
    const newMsgId = await generateCompanyUniqueId(companyId, 'messages');
    const contentType = type === 'text' ? detectMarkdown(content) : 'plain';

    // Create the message reply document
    const reply = await Message.create({
      id: newMsgId,
      companyId,
      conversationId: thread.conversationId,
      senderId,
      senderName,
      senderAvatar,
      senderRole,
      content,
      type,
      media,
      contentType,
      threadId: thread._id,
      isThreadReply: true
    });

    // Update Thread document:
    const now = new Date();
    thread.replyCount += 1;
    thread.lastReplyAt = now;
    
    // Add sender to participants and followers if not present
    if (!thread.participants.includes(senderId)) {
      thread.participants.push(senderId);
    }
    if (!thread.followers.includes(senderId)) {
      thread.followers.push(senderId);
    }

    // Update readStates
    // 1. Reset/Set sender's readState
    let senderState = thread.readStates.find(state => state.employeeId === senderId);
    if (senderState) {
      senderState.lastReadAt = now;
      senderState.unreadCount = 0;
    } else {
      thread.readStates.push({ employeeId: senderId, lastReadAt: now, unreadCount: 0 });
    }

    // 2. Increment unread count for other followers
    thread.followers.forEach(followerId => {
      if (followerId !== senderId) {
        let followerState = thread.readStates.find(state => state.employeeId === followerId);
        if (followerState) {
          followerState.unreadCount += 1;
        } else {
          thread.readStates.push({ employeeId: followerId, lastReadAt: new Date(0), unreadCount: 1 });
        }
      }
    });

    await thread.save();

    // Broadcast changes via Socket.io
    try {
      const io = getIO();
      // Emit to thread channel
      io.to(`thread:${threadId}`).emit('thread:reply:new', {
        threadId: thread._id,
        reply,
        tempId
      });

      // Emit to conversation channel (to update message count summary and conversation status)
      io.to(`conv:${thread.conversationId}`).emit('thread:updated', {
        threadId: thread._id,
        rootMessageId: thread.rootMessageId,
        replyCount: thread.replyCount,
        lastReplyAt: thread.lastReplyAt,
        status: thread.status,
        participants: thread.participants
      });

      // Notify mentioned users or other followers
      const mentions = [];
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1]); // capturing username / employeeId
      }

      // Check for @everyone mention
      const hasEveryone = content?.includes('@everyone');

      const participantsToNotify = hasEveryone 
        ? conv.participants.map(p => p.employeeId)
        : thread.followers;

      participantsToNotify.forEach(userId => {
        if (userId !== senderId) {
          // If user is directly mentioned, emit thread:mention
          const isMentioned = hasEveryone || mentions.includes(userId);
          if (isMentioned) {
            io.to(`user:${userId}`).emit('thread:mention', {
              threadId: thread._id,
              conversationId: thread.conversationId,
              rootMessageId: thread.rootMessageId,
              replyId: reply.id,
              senderName,
              preview: content?.substring(0, 100)
            });
          }

          // General thread notification trigger
          io.to(`user:${userId}`).emit('new_thread_notification', {
            threadId: thread._id,
            conversationId: thread.conversationId,
            rootMessageId: thread.rootMessageId,
            replyId: reply.id,
            senderName,
            preview: content?.substring(0, 100),
            unreadCount: (thread.readStates.find(state => state.employeeId === userId)?.unreadCount || 0)
          });
        }
      });

    } catch (e) {
      logger.warn('[ThreadService] Socket broadcasts failed for thread reply:', e.message);
    }

    return reply;
  });
};

/**
 * Follow a thread.
 */
export const followThread = async (threadId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    if (!thread.followers.includes(employeeId)) {
      thread.followers.push(employeeId);
    }

    // Add read state if not present
    const hasReadState = thread.readStates.some(state => state.employeeId === employeeId);
    if (!hasReadState) {
      thread.readStates.push({ employeeId, lastReadAt: new Date(), unreadCount: 0 });
    }

    await thread.save();
    return thread;
  });
};

/**
 * Unfollow a thread.
 */
export const unfollowThread = async (threadId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    thread.followers = thread.followers.filter(f => f !== employeeId);
    thread.readStates = thread.readStates.filter(s => s.employeeId !== employeeId);

    await thread.save();
    return thread;
  });
};

/**
 * Mark thread as read for a specific user.
 */
export const markThreadAsRead = async (threadId, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const state = thread.readStates.find(s => s.employeeId === employeeId);
    if (state) {
      state.lastReadAt = new Date();
      state.unreadCount = 0;
    } else {
      thread.readStates.push({ employeeId, lastReadAt: new Date(), unreadCount: 0 });
    }

    await thread.save();

    try {
      const io = getIO();
      io.to(`user:${employeeId}`).emit('thread:read', { threadId: thread._id });
    } catch (e) {}

    return thread;
  });
};

/**
 * Reopen, Resolve, or Close a thread.
 */
export const updateThreadStatus = async (threadId, status, employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const validStatuses = ['open', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    thread.status = status;
    await thread.save();

    // Broadcast status change
    try {
      const io = getIO();
      const payload = {
        threadId: thread._id,
        rootMessageId: thread.rootMessageId,
        status: thread.status,
        replyCount: thread.replyCount,
        lastReplyAt: thread.lastReplyAt,
        participants: thread.participants
      };

      io.to(`thread:${threadId}`).emit('thread:updated', payload);
      io.to(`conv:${thread.conversationId}`).emit('thread:updated', payload);
    } catch (e) {}

    return thread;
  });
};

/**
 * Returns a list of active threads for a specific employee (Activity Center).
 * Displays threads they created, followed, participated in, or were mentioned in.
 */
export const getThreadActivityList = async (employeeId, companyId) => {
  return runWithTenant(companyId, async () => {
    // Find all threads where the user is a follower or participant
    const threads = await Thread.find({
      $or: [
        { followers: employeeId },
        { participants: employeeId },
        { createdBy: employeeId }
      ]
    })
      .sort({ lastReplyAt: -1 })
      .lean();

    if (threads.length === 0) return [];

    const threadIds = threads.map(t => t._id);
    const rootMessageIds = threads.map(t => t.rootMessageId);

    // Fetch root messages
    const rootMessages = await Message.find({ id: { $in: rootMessageIds } }, { lean: true });
    const rootMsgMap = rootMessages.reduce((acc, m) => {
      acc[m.id] = m;
      return acc;
    }, {});

    // Fetch last replies
    const lastReplies = await Message.aggregate([
      { $match: { threadId: { $in: threadIds }, isThreadReply: true, isDeleted: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$threadId', lastReply: { $first: '$$ROOT' } } }
    ]);
    const lastReplyMap = lastReplies.reduce((acc, group) => {
      acc[group._id.toString()] = group.lastReply;
      return acc;
    }, {});

    // Resolve employee details
    const allUserIds = new Set();
    threads.forEach(t => {
      t.participants.forEach(p => allUserIds.add(p));
      allUserIds.add(t.createdBy);
    });
    const employeeMap = await resolveEmployeeDetails(Array.from(allUserIds), companyId);

    return threads.map(thread => {
      const state = thread.readStates.find(s => s.employeeId === employeeId);
      const rootMsg = rootMsgMap[thread.rootMessageId];
      const lastReply = lastReplyMap[thread._id.toString()];

      return {
        threadId: thread._id,
        rootMessageId: thread.rootMessageId,
        conversationId: thread.conversationId,
        replyCount: thread.replyCount,
        lastReplyAt: thread.lastReplyAt,
        status: thread.status,
        createdBy: thread.createdBy,
        createdByDetails: employeeMap[thread.createdBy] || { id: thread.createdBy, name: 'Unknown User' },
        participantsDetails: thread.participants.slice(0, 3).map(p => employeeMap[p] || { id: p, name: 'Unknown User' }),
        unreadCount: state ? state.unreadCount : 0,
        rootMessagePreview: rootMsg ? rootMsg.content?.substring(0, 100) : 'Original message deleted',
        rootMsgSenderName: rootMsg ? rootMsg.senderName : 'System',
        lastReplyPreview: lastReply ? lastReply.content?.substring(0, 100) : null,
        lastReplySenderName: lastReply ? lastReply.senderName : null
      };
    });
  });
};

/**
 * Searches replies inside threads.
 */
export const searchThreads = async (employeeId, companyId, queryOptions = {}) => {
  return runWithTenant(companyId, async () => {
    const { q = '', threadId, status, mention } = queryOptions;

    // 1. Build filter query
    const messageFilter = {
      isThreadReply: true,
      isDeleted: { $ne: true }
    };

    if (q) {
      messageFilter.content = { $regex: q.trim(), $options: 'i' };
    }

    if (threadId) {
      messageFilter.threadId = new mongoose.Types.ObjectId(threadId);
    }

    if (mention) {
      // Filter where user is mentioned (@employeeId or @everyone)
      messageFilter.$or = [
        { content: { $regex: `@${employeeId}`, $options: 'i' } },
        { content: { $regex: '@everyone', $options: 'i' } }
      ];
    }

    // If status filter is active, fetch threads with that status first
    if (status) {
      const matchedThreads = await Thread.find({
        status,
        $or: [{ followers: employeeId }, { participants: employeeId }, { createdBy: employeeId }]
      }).select('_id');
      const matchedThreadIds = matchedThreads.map(t => t._id);
      messageFilter.threadId = { $in: matchedThreadIds };
    }

    // 2. Fetch matched messages
    const replies = await Message.find(messageFilter, { sort: { createdAt: -1 }, limit: 50, lean: true });

    return replies;
  });
};

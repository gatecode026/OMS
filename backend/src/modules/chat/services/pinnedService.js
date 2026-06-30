/**
 * @file src/modules/chat/services/pinnedService.js
 * @description Business logic for fetching pinned messages in a conversation.
 *   Validates conversation membership and enforces logical tenant scoping.
 */

import Conversation from '../conversation.repository.js';
import Message from '../message.repository.js';
import { runWithTenant } from '../../../utils/tenantContext.js';

/**
 * Gets paginated, filtered, and sorted pinned messages for a conversation.
 * Ensures the requesting user is a member of the conversation and respects tenant scoping.
 */
export const getPinnedMessages = async (conversationId, employeeId, companyId, queryOptions = {}) => {
  return runWithTenant(companyId, async () => {
    // 1. Verify membership and active conversation status
    const conv = await Conversation.findOne({
      id: conversationId,
      'participants.employeeId': employeeId,
      isActive: true
    });
    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    // 2. Build MongoDB query
    const query = {
      conversationId,
      isPinned: true,
      isDeleted: { $ne: true },
      $nor: [{ 'deletedFor.employeeId': employeeId }]
    };

    const deleteEntry = conv.deletedBy?.find(d => d.userId?.toString() === employeeId?.toString());
    if (deleteEntry) {
      query.createdAt = { $gt: deleteEntry.deletedAt };
    }

    // Apply Search
    if (queryOptions.search) {
      const q = queryOptions.search.trim();
      if (q) {
        query.$or = [
          { content: { $regex: q, $options: 'i' } },
          { senderName: { $regex: q, $options: 'i' } },
          { 'media.fileName': { $regex: q, $options: 'i' } }
        ];
      }
    }

    // Apply Filters (text, image, video, document, voice_note)
    if (queryOptions.filter) {
      const filter = queryOptions.filter.toLowerCase();
      if (filter === 'text') {
        query.type = 'text';
      } else if (filter === 'image') {
        query.type = 'image';
      } else if (filter === 'audio' || filter === 'voice' || filter === 'voice_note') {
        query.type = 'audio';
      } else if (filter === 'video') {
        query.type = 'file';
        query['media.mimeType'] = /^video\//;
      } else if (filter === 'document' || filter === 'file') {
        query.type = 'file';
        query['media.mimeType'] = { $not: /^video\// };
      }
    }

    // Apply Sorting
    let sortObj = { pinnedAt: -1 }; // default recently pinned
    if (queryOptions.sortBy) {
      const sortBy = queryOptions.sortBy.toLowerCase();
      if (sortBy === 'oldest_pinned') {
        sortObj = { pinnedAt: 1 };
      } else if (sortBy === 'original_date') {
        sortObj = { createdAt: -1 };
      } else if (sortBy === 'original_date_asc') {
        sortObj = { createdAt: 1 };
      }
    }

    // Pagination
    const page = Math.max(1, parseInt(queryOptions.page) || 1);
    const limit = Math.max(1, parseInt(queryOptions.limit) || 20);
    const skip = (page - 1) * limit;

    // Execute queries
    const [messages, totalPinned] = await Promise.all([
      Message.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(query)
    ]);

    // Format output
    const formattedMessages = messages.map(msg => ({
      messageId: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      messageType: msg.type,
      text: msg.content,
      attachment: msg.media || null,
      originalTimestamp: msg.createdAt,
      pinnedTimestamp: msg.pinnedAt,
      isPinned: msg.isPinned
    }));

    const totalPages = Math.ceil(totalPinned / limit);

    return {
      messages: formattedMessages,
      totalPinned,
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  });
};

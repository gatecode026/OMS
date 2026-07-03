/**
 * @file src/modules/chat/services/searchService.js
 * @description Service logic for global chat search across conversations, messages, files, and contacts.
 */

import Conversation from '../conversation.model.js';
import Message from '../message.model.js';
import Employee from '../../employees/employees.model.js';
import { getTenantId } from '../../../utils/tenantContext.js';

/**
 * Searches messages, files, conversations, and contacts within the active tenant scope
 * and filters by user authorization (user must be a participant of the conversations).
 */
export const performGlobalSearch = async ({ query, category = 'all', userId, page = 1, limit = 10 }) => {
  const q = (query || '').trim();
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const skipNum = (pageNum - 1) * limitNum;

  const tenantId = getTenantId();

  // Find all active conversations where current user is a participant
  const myConversations = await Conversation.find({
    'participants.employeeId': userId,
    isActive: true
  }).lean();

  if (myConversations.length === 0) {
    return {
      conversations: [],
      messages: [],
      files: [],
      contacts: []
    };
  }

  const myConvIds = myConversations.map(c => c.id);

  const conversationQueries = myConversations.map(conv => {
    const deleteEntry = conv.deletedBy?.find(d => d.userId === userId);
    if (deleteEntry) {
      return {
        conversationId: conv.id,
        createdAt: { $gt: deleteEntry.deletedAt }
      };
    } else {
      return { conversationId: conv.id };
    }
  });

  const results = {
    conversations: [],
    messages: [],
    files: [],
    contacts: []
  };

  if (!q) {
    return results;
  }

  // 1. CONVERSATIONS SEARCH
  if (category === 'all' || category === 'conversations') {
    results.conversations = await Conversation.find({
      id: { $in: myConvIds },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'participants.name': { $regex: q, $options: 'i' } }
      ]
    })
    .sort({ lastActivityAt: -1 })
    .skip(skipNum)
    .limit(limitNum)
    .lean();
  }

  // 2. MESSAGES SEARCH
  if (category === 'all' || category === 'messages') {
    const matchedMessages = await Message.find({
      $or: conversationQueries,
      isDeleted: false,
      'deletedFor.employeeId': { $ne: userId },
      type: { $in: ['text', 'emoji'] },
      $and: [
        {
          $or: [
            { content: { $regex: q, $options: 'i' } },
            { senderName: { $regex: q, $options: 'i' } },
            { 'replyTo.content': { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skipNum)
    .limit(limitNum)
    .lean();

    results.messages = matchedMessages
      .map(m => {
        const content = m.content || '';
        const plainText = stripMarkdown(content);
        
        const matchText = (q || '').toLowerCase();
        const matchesContent = plainText.toLowerCase().includes(matchText);
        const matchesSender = (m.senderName || '').toLowerCase().includes(matchText);
        const matchesReply = (m.replyTo?.content || '').toLowerCase().includes(matchText);

        if (!matchesContent && !matchesSender && !matchesReply) {
          return null;
        }

        const snippetSource = matchesContent ? plainText : (matchesReply ? stripMarkdown(m.replyTo.content) : plainText);

        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderName: m.senderName,
          senderAvatar: m.senderAvatar,
          type: m.type,
          content: m.content,
          createdAt: m.createdAt,
          matchedSnippet: getContentSnippet(snippetSource, q),
          highlightedMatch: getHighlightedContent(snippetSource, q)
        };
      })
      .filter(Boolean);
  }

  // 3. FILES SEARCH
  if (category === 'all' || category === 'files') {
    const fileMessages = await Message.find({
      $or: conversationQueries,
      isDeleted: false,
      'deletedFor.employeeId': { $ne: userId },
      type: { $in: ['file', 'image', 'video', 'audio'] },
      'media.url': { $ne: null },
      $and: [
        {
          $or: [
            { 'media.fileName': { $regex: q, $options: 'i' } },
            { 'media.mimeType': { $regex: q, $options: 'i' } },
            { senderName: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skipNum)
    .limit(limitNum)
    .lean();

    results.files = fileMessages.map(m => {
      const conv = myConversations.find(c => c.id === m.conversationId);
      let conversationName = 'Unknown Conversation';
      if (conv) {
        conversationName = conv.name || getDirectChatPartnerName(conv, userId);
      }
      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.senderName,
        createdAt: m.createdAt,
        media: m.media,
        type: m.type,
        conversationName
      };
    });
  }

  // 4. CONTACTS SEARCH
  if (category === 'all' || category === 'contacts') {
    results.contacts = await Employee.find({
      status: { $ne: 'Inactive' },
      id: { $ne: userId },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { designation: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } }
      ]
    })
    .skip(skipNum)
    .limit(limitNum)
    .lean();
  }

  return results;
};

const getContentSnippet = (content, query) => {
  if (!content) return '';
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.substring(0, 60);
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + query.length + 30);
  return (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
};

const getHighlightedContent = (content, query) => {
  if (!content) return '';
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return content.replace(regex, '<mark class="search-highlight">$1</mark>');
};

const escapeRegex = (str) => {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

export const stripMarkdown = (text) => {
  if (!text) return '';
  return text
    // Remove code blocks (```lang ... ```)
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold/italic (**bold**, *italic*)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove strikethrough (~strike~)
    .replace(/~([^~]+)~/g, '$1')
    // Remove blockquotes (> quote)
    .replace(/^\s*>\s+/gm, '')
    // Remove list markers
    .replace(/^\s*[\*\-+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove horizontal rules
    .replace(/^\s*-{3,}\s*$/gm, '')
    // Trim multiple newlines and spaces
    .replace(/\s+/g, ' ')
    .trim();
};

const getDirectChatPartnerName = (conv, currentUserId) => {
  if (conv.type === 'group') return conv.name || 'Group Chat';
  const partner = conv.participants?.find(p => p.employeeId !== currentUserId);
  return partner ? partner.name : 'Direct Chat';
};

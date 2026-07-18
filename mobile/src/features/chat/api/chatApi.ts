/**
 * @file chatApi.ts
 * @description API service calls for Enterprise Chat and Conversation management.
 */

import apiClient from '../../../shared/services/apiClient';
import { ChatConversation, ChatMessage, CallLog } from '../types';

/**
 * Normalize MongoDB documents: map _id → id so all consumers use conv.id consistently.
 * The backend may return either `id` (virtual) or `_id` (raw Mongo) depending on toJSON config.
 */
const normalizeId = <T extends Record<string, any>>(obj: T): T => {
  if (!obj) return obj;
  if (obj._id && !obj.id) {
    return { ...obj, id: String(obj._id) };
  }
  return obj;
};

export const chatApi = {
  /**
   * Fetch all active conversations for the authenticated employee.
   */
  async fetchConversations(): Promise<ChatConversation[]> {
    const response = await apiClient.get('/api/v1/chat/conversations');
    const raw: any[] = response.data?.data || response.data || [];
    return raw.map(normalizeId) as ChatConversation[];
  },

  /**
   * Fetch messages in a specific conversation (paginated or last N).
   */
  async fetchMessages(conversationId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get(`/api/v1/chat/conversations/${conversationId}/messages`);
    const data = response.data?.data || response.data;
    const msgs: any[] = data?.messages || (Array.isArray(data) ? data : []);
    return msgs.map(normalizeId) as ChatMessage[];
  },

  /**
   * Mark all messages in a conversation as read.
   */
  async markAsRead(conversationId: string): Promise<void> {
    await apiClient.patch(`/api/v1/chat/conversations/${conversationId}/read`);
  },

  /**
   * Start a direct chat with another employee.
   */
  async startDirectChat(targetEmployeeId: string): Promise<ChatConversation> {
    const response = await apiClient.post('/api/v1/chat/conversations/direct', {
      targetEmployeeId,
    });
    // Backend returns: { status, message, data: { isNew, conversation } }
    // We need the conversation object, not the outer wrapper
    const payload = response.data?.data || response.data;
    return payload?.conversation || payload;
  },

  async createGroupChat(name: string, participantIds: string[], description?: string, avatar?: string): Promise<ChatConversation> {
    const response = await apiClient.post('/api/v1/chat/conversations/group', {
      name,
      participantIds,
      description,
      avatar,
    });
    return response.data?.data || response.data;
  },

  /**
   * Search for employees to start a new chat.
   */
  async searchEmployees(query: string = ''): Promise<any[]> {
    const response = await apiClient.get(`/api/v1/chat/employees?q=${encodeURIComponent(query)}`);
    return response.data?.data || response.data || [];
  },

  /**
   * Fetch call history.
   */
  async fetchCallHistory(): Promise<CallLog[]> {
    const response = await apiClient.get('/api/v1/chat/calls/history');
    return response.data?.data || response.data || [];
  },

  /**
   * Fetch archived conversations.
   */
  async fetchArchivedConversations(): Promise<ChatConversation[]> {
    const response = await apiClient.get('/api/v1/chat/conversations/archived');
    return response.data?.data || response.data || [];
  },

  /**
   * Archive a conversation.
   */
  async archiveConversation(conversationId: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/conversations/${conversationId}/archive`);
  },

  /**
   * Unarchive a conversation.
   */
  async unarchiveConversation(conversationId: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/conversations/${conversationId}/unarchive`);
  },

  /**
   * Clear chat history.
   */
  async clearChat(conversationId: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/conversations/${conversationId}/clear`);
  },

  /**
   * Delete conversation for the current user.
   */
  async deleteConversationForMe(conversationId: string): Promise<void> {
    await apiClient.delete(`/api/v1/chat/conversations/${conversationId}/me`);
  },

  /**
   * Block a user.
   */
  async blockUser(employeeId: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/users/${employeeId}/block`);
  },

  /**
   * Unblock a user.
   */
  async unblockUser(employeeId: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/users/${employeeId}/unblock`);
  },

  /**
   * React to a message.
   */
  async reactToMessage(messageId: string, reaction: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/messages/${messageId}/react`, { reaction });
  },

  /**
   * Edit a message.
   */
  async editMessage(messageId: string, content: string): Promise<void> {
    await apiClient.patch(`/api/v1/chat/messages/${messageId}/edit`, { content });
  },

  /**
   * Delete a message (for everyone or for me depending on backend).
   */
  async deleteMessage(messageId: string, deleteForEveryone: boolean = false): Promise<void> {
    await apiClient.delete(`/api/v1/chat/messages/${messageId}`, {
      data: { deleteForEveryone }
    });
  },

  /**
   * Hide a conversation.
   */
  async hideConversation(conversationId: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/conversations/${conversationId}/hide`);
  },

  /**
   * Unhide a conversation.
   */
  async unhideConversation(conversationId: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/conversations/${conversationId}/unhide`);
  },

  /**
   * Fetch hidden conversations.
   */
  async fetchHiddenConversations(): Promise<ChatConversation[]> {
    const response = await apiClient.get('/api/v1/chat/conversations/hidden');
    return response.data?.data || response.data || [];
  },

  /**
   * Global search across conversations, messages, files, and contacts.
   */
  async globalSearch(query: string, category: string = 'all'): Promise<any> {
    const response = await apiClient.get(`/api/v1/chat/search?q=${encodeURIComponent(query)}&category=${category}`);
    return response.data?.data || response.data;
  },

  /**
   * Update group conversation details (e.g. settings, name, description).
   */
  async updateGroupDetails(conversationId: string, data: any): Promise<ChatConversation> {
    const response = await apiClient.patch(`/api/v1/chat/conversations/${conversationId}`, data);
    return response.data?.data || response.data;
  },

  /**
   * Fetch thread activity list for the user.
   */
  async fetchThreadActivity(): Promise<any[]> {
    const response = await apiClient.get('/api/v1/chat/threads/activity');
    return response.data?.data || response.data || [];
  },

  /**
   * Fetch details of a specific thread.
   */
  async fetchThreadDetails(threadId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/chat/threads/${threadId}`);
    return response.data?.data || response.data;
  },

  /**
   * Fetch replies in a thread.
   */
  async fetchThreadReplies(threadId: string, cursor?: string, limit?: number): Promise<any> {
    const response = await apiClient.get(`/api/v1/chat/threads/${threadId}/messages`, {
      params: { cursor, limit }
    });
    return response.data?.data || response.data || [];
  },

  /**
   * Send a reply in a thread.
   */
  async sendThreadReply(threadId: string, data: { content: string; type: string; media?: any; tempId?: string }): Promise<any> {
    const response = await apiClient.post(`/api/v1/chat/threads/${threadId}/reply`, data);
    return response.data?.data || response.data;
  },

  /**
   * Follow a thread.
   */
  async followThread(threadId: string): Promise<any> {
    const response = await apiClient.post(`/api/v1/chat/threads/${threadId}/follow`);
    return response.data?.data || response.data;
  },

  /**
   * Unfollow a thread.
   */
  async unfollowThread(threadId: string): Promise<any> {
    const response = await apiClient.post(`/api/v1/chat/threads/${threadId}/unfollow`);
    return response.data?.data || response.data;
  },

  /**
   * Mark a thread as read.
   */
  async markThreadRead(threadId: string): Promise<any> {
    const response = await apiClient.post(`/api/v1/chat/threads/${threadId}/read`);
    return response.data?.data || response.data;
  },

  /**
   * Create a thread from a root message.
   */
  async createThread(rootMessageId: string): Promise<any> {
    const response = await apiClient.post('/api/v1/chat/threads', { rootMessageId });
    return response.data?.data || response.data;
  },

  /**
   * Fetch pinned messages in a conversation.
   */
  async fetchPinnedMessages(conversationId: string, params?: any): Promise<any> {
    const response = await apiClient.get(`/api/v1/chat/conversations/${conversationId}/pinned`, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Add members to a group conversation.
   */
  async addGroupMembers(conversationId: string, memberIds: string[]): Promise<any> {
    const response = await apiClient.post(`/api/v1/chat/conversations/${conversationId}/members`, { memberIds });
    return response.data?.data || response.data;
  },

  /**
   * Remove a member from a group.
   */
  async removeGroupMember(conversationId: string, memberId: string): Promise<any> {
    const response = await apiClient.delete(`/api/v1/chat/conversations/${conversationId}/members/${memberId}`);
    return response.data?.data || response.data;
  },

  async fetchBlockedUsers(): Promise<{ blockedUsers: Array<{ id: string }>; blockedByUsers: string[] }> {
    const response = await apiClient.get('/api/v1/chat/users/blocked');
    const data = response.data?.data || response.data;
    const blockedUsers = data?.blockedUsers || [];
    const blockedByUsers = data?.blockedByUsers || [];
    return {
      blockedUsers: blockedUsers.map((id: string) => ({ id })),
      blockedByUsers
    };
  },

  /**
   * Report a user.
   */
  async reportUser(targetUserId: string, category: string, description?: string, screenshotUrl?: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/users/${targetUserId}/report`, {
      category,
      description,
      screenshotUrl,
    });
  },

  /**
   * Audit log an export action on the server.
   */
  async exportChat(conversationId: string): Promise<void> {
    await apiClient.post(`/api/v1/chat/conversations/${conversationId}/export`);
  },

  async pinMessage(conversationId: string, messageId: string): Promise<any> {
    const response = await apiClient.post(`/api/v1/chat/conversations/${conversationId}/messages/${messageId}/pin`);
    return response.data?.data || response.data;
  },

  async unpinMessage(conversationId: string, messageId: string): Promise<any> {
    const response = await apiClient.delete(`/api/v1/chat/conversations/${conversationId}/messages/${messageId}/pin`);
    return response.data?.data || response.data;
  },

  async starMessage(messageId: string): Promise<any> {
    const response = await apiClient.post(`/api/v1/chat/messages/${messageId}/star`);
    return response.data?.data || response.data;
  },

  async unstarMessage(messageId: string): Promise<any> {
    const response = await apiClient.delete(`/api/v1/chat/messages/${messageId}/star`);
    return response.data?.data || response.data;
  },

  async fetchStarredMessages(): Promise<any[]> {
    const response = await apiClient.get('/api/v1/chat/messages/starred');
    return response.data?.data || response.data || [];
  },

  async fetchSharedContentSummary(conversationId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/chat/conversations/${conversationId}/shared-content`);
    return response.data?.data || response.data;
  },

  async updateStatus(status: string, emoji: string | null, expiresInMinutes: number | null): Promise<any> {
    const response = await apiClient.patch('/api/v1/chat/status', { status, emoji, expiresInMinutes });
    return response.data?.data || response.data;
  },

  async fetchUserPresence(userId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/chat/presence/${userId}`);
    return response.data?.data || response.data;
  },

  async fetchLastSeen(userId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/chat/users/${userId}/last-seen`);
    return response.data?.data || response.data;
  },

  async pingServer(): Promise<{ timestamp: number }> {
    const response = await apiClient.get('/api/v1/chat/ping');
    return response.data?.data || response.data;
  },

  async searchMessagesInConversation(conversationId: string, query: string): Promise<any[]> {
    const response = await apiClient.get(`/api/v1/chat/conversations/${conversationId}/search`, {
      params: { q: query }
    });
    return response.data?.data || response.data || [];
  },
};

export default chatApi;

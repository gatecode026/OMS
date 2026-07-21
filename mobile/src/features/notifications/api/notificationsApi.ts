/**
 * @file notificationsApi.ts
 * @description API service to connect with the backend Enterprise Notification Engine.
 */

import apiClient from '../../../shared/services/apiClient';
import { AppNotification } from '../types';

export const notificationsApi = {
  /**
   * Fetch all notifications for the current authenticated user.
   */
  async fetchNotifications(): Promise<AppNotification[]> {
    const response = await apiClient.get('/api/v1/notifications');
    const data = response.data?.data || response.data;
    if (data && typeof data === 'object' && Array.isArray(data.notifications)) {
      return data.notifications;
    }
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get the unread notifications count for the badge indicator.
   */
  async fetchUnreadCount(): Promise<number> {
    const response = await apiClient.get('/api/v1/notifications/unread-count');
    // Expecting response.data.data.count or response.data.count or similar
    const data = response.data?.data || response.data;
    if (data && typeof data === 'object') {
      return data.count !== undefined ? data.count : (data.unreadCount !== undefined ? data.unreadCount : 0);
    }
    return typeof data === 'number' ? data : 0;
  },

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/api/v1/notifications/read-all');
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/api/v1/notifications/${id}/read`);
  },

  /**
   * Delete a notification.
   */
  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/notifications/${id}`);
  },

  /**
   * Fetch notification preferences.
   */
  async fetchPreferences(): Promise<any> {
    const response = await apiClient.get('/api/v1/notifications/preferences');
    return response.data?.data || response.data || {};
  },

  /**
   * Update notification preferences.
   */
  async savePreferences(prefs: any): Promise<any> {
    const response = await apiClient.put('/api/v1/notifications/preferences', prefs);
    return response.data?.data || response.data;
  },
};

export default notificationsApi;

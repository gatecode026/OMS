/**
 * @file NotificationManager.ts
 * @description Centralized Notification Engine for in-app banner alerts
 *              and push notification dispatching across Direct Messages, Group Updates,
 *              Mentions, Approvals, and Announcements.
 */

import { toast } from '../../../shared/components/Toast';

export interface NotificationPayload {
  id: string;
  type: 'message' | 'mention' | 'reply' | 'group_event' | 'approval' | 'announcement';
  title: string;
  body: string;
  conversationId?: string;
  data?: any;
}

export class NotificationManagerClass {
  /**
   * Display in-app banner toast notification
   */
  showInAppBanner(payload: NotificationPayload): void {
    const iconPrefix = payload.type === 'mention' ? '🏷️ ' : payload.type === 'group_event' ? '👥 ' : '💬 ';
    toast.info(`${iconPrefix}${payload.title}: ${payload.body}`);
  }

  /**
   * Format message notification payload
   */
  createMessageNotification(senderName: string, content: string, conversationId: string): NotificationPayload {
    return {
      id: `notif_${Date.now()}`,
      type: 'message',
      title: senderName,
      body: content || 'Sent an attachment',
      conversationId,
    };
  }
}

export const NotificationManager = new NotificationManagerClass();
export default NotificationManager;

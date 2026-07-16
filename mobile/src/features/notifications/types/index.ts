/**
 * @file index.ts
 * @description Notification types for the Enterprise Notification Module.
 */

export interface AppNotification {
  id: string;
  userId: string;
  companyId: string;
  type: string;
  category: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  read: boolean; // Backwards compatibility alias
  priority: 'normal' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  categories: Record<string, boolean>;
}

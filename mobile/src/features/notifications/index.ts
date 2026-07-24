/**
 * @file index.ts
 * @description Barrel exports for the Notifications feature.
 */

export * from './types';
export { default as notificationsApi } from './api/notificationsApi';
export {
  useNotifications,
  useNotificationsUnreadCount,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from './hooks/useNotifications';

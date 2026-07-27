/**
 * @file useNotifications.ts
 * @description React Query hooks for the Notifications module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationsApi from '../api/notificationsApi';
import useOfflineStore from '../../../shared/store/offlineStore';

export const useNotifications = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.fetchNotifications(),
    enabled: isConnected,
    staleTime: 30 * 1000, // 30 seconds stale time
  });
};

export const useNotificationsUnreadCount = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.fetchUnreadCount(),
    enabled: isConnected,
    staleTime: 10 * 1000, // 10 seconds stale time
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationsApi.fetchPreferences(),
  });
};

export const useSaveNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: any) => notificationsApi.savePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
  });
};
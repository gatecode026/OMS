/**
 * @file useGlobalSockets.ts
 * @description Hook to listen to global Socket.IO events (notifications, profile, company, permissions updates)
 *              and automatically invalidate relevant React Query cache keys for instant real-time synchronization.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socketManager';
import useAuthStore from '../store/authStore';
import useBranding from './useBranding';
import { useThemeStore } from '../store/themeStore';
import authApi from '../../features/auth/api/authApi';
import { toast } from '../components/Toast';

export const useGlobalSockets = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const setTenantBranding = useThemeStore((s) => s.setTenantBranding);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    const handleNewNotification = (data: any) => {
      console.log('[GlobalSocket] notification:new received:', data);
      // Invalidate both lists and unread count queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Optionally show in-app banner for general notifications
      const title = data?.title || 'New Notification';
      const message = data?.message || '';
      toast.show(`${title}: ${message}`, 'info');
    };

    const handleNotificationRead = (data: any) => {
      console.log('[GlobalSocket] notification:read received:', data);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleProfileUpdated = (data: any) => {
      console.log('[GlobalSocket] profile:updated received:', data);
      // Invalidate profile query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // If the updated user is the current user, update Zustand store
      if (data?.id === currentUser?.id || data?.employeeId === currentUser?.id) {
        const updateFields: Record<string, any> = {};
        if (data.name) updateFields.name = data.name;
        if (data.email) updateFields.email = data.email;
        if (data.avatarUrl || data.avatar || data.photoUrl) {
          updateFields.avatarUrl = data.avatarUrl || data.avatar || data.photoUrl;
        }
        if (Object.keys(updateFields).length > 0) {
          useAuthStore.getState().updateUser(updateFields);
        }
      }
    };

    const handleCompanyUpdated = async (data: any) => {
      console.log('[GlobalSocket] company:updated received:', data);
      // Refetch branding settings
      const companyId = currentUser?.companyId;
      if (companyId) {
        try {
          const branding = await authApi.fetchBranding(companyId);
          if (branding) {
            setTenantBranding({
              primary: branding.settings?.primaryColor,
              secondary: branding.settings?.secondaryColor,
              companyName: branding.name,
              logoUrl: branding.settings?.logoUrl,
            });
            console.log('[GlobalSocket] Dynamic company branding updated.');
          }
        } catch (err) {
          console.warn('[GlobalSocket] Failed to fetch company branding on update event:', err);
        }
      }
    };

    const handlePermissionUpdated = (data: any) => {
      console.log('[GlobalSocket] permission:updated received:', data);
      // Invalidate roles list and overrides queries
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    };

    const handleAttendanceUpdated = (data: any) => {
      console.log('[GlobalSocket] attendance updated/created received:', data);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    };

    // Attach listeners
    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);
    socket.on('profile:updated', handleProfileUpdated);
    socket.on('company:updated', handleCompanyUpdated);
    socket.on('permission:updated', handlePermissionUpdated);
    socket.on('entity:sync', handleAttendanceUpdated);
    socket.on('attendance:updated', handleAttendanceUpdated);
    socket.on('attendance:created', handleAttendanceUpdated);

    // Also support fallback event names if backend fires them
    socket.on('notification_received', handleNewNotification);
    socket.on('profile_updated', handleProfileUpdated);
    socket.on('company_updated', handleCompanyUpdated);
    socket.on('permissions_updated', handlePermissionUpdated);

    return () => {
      // Detach listeners on unmount or logout
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:read', handleNotificationRead);
      socket.off('profile:updated', handleProfileUpdated);
      socket.off('company:updated', handleCompanyUpdated);
      socket.off('permission:updated', handlePermissionUpdated);
      socket.off('entity:sync', handleAttendanceUpdated);
      socket.off('attendance:updated', handleAttendanceUpdated);
      socket.off('attendance:created', handleAttendanceUpdated);
      
      socket.off('notification_received', handleNewNotification);
      socket.off('profile_updated', handleProfileUpdated);
      socket.off('company_updated', handleCompanyUpdated);
      socket.off('permissions_updated', handlePermissionUpdated);
    };
  }, [isAuthenticated, currentUser?.id, currentUser?.companyId, queryClient, setTenantBranding]);
};

export default useGlobalSockets;

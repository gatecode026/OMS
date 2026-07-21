/**
 * @file useDashboard.ts
 * @description React Query hook to manage dashboard data aggregation, role-based visibility, and offline status.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import dashboardApi, { DashboardStats, UpcomingEvent, RecentActivity } from '../api/dashboardApi';
import useAuthStore from '../../../shared/store/authStore';
import useOfflineStore from '../../../shared/store/offlineStore';

export const useDashboard = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isConnected = useOfflineStore((state) => state.isConnected);

  const role = user?.role || 'Employee';

  // 1. Query for role-based statistics
  const statsQuery = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats', role],
    queryFn: () => dashboardApi.fetchStats(role),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // 2. Query for upcoming calendar events
  const eventsQuery = useQuery<UpcomingEvent[]>({
    queryKey: ['dashboard', 'events'],
    queryFn: () => dashboardApi.fetchUpcomingEvents(),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // 3. Query for recent activities
  const activitiesQuery = useQuery<RecentActivity[]>({
    queryKey: ['dashboard', 'activities'],
    queryFn: () => dashboardApi.fetchRecentActivities(),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  /**
   * Refetch all dashboard queries (called during Pull-To-Refresh)
   */
  const refetchAll = async () => {
    await Promise.all([
      statsQuery.refetch(),
      eventsQuery.refetch(),
      activitiesQuery.refetch(),
    ]);
  };

  const isLoading = statsQuery.isLoading || eventsQuery.isLoading || activitiesQuery.isLoading;
  const isRefetching = statsQuery.isRefetching || eventsQuery.isRefetching || activitiesQuery.isRefetching;
  const hasError = statsQuery.isError || eventsQuery.isError || activitiesQuery.isError;

  return {
    role,
    user,
    stats: statsQuery.data,
    events: eventsQuery.data || [],
    activities: activitiesQuery.data || [],
    isLoading,
    isRefetching,
    hasError,
    isConnected,
    refetchAll,
  };
};

export default useDashboard;

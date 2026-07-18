/**
 * @file useAttendance.ts
 * @description Hook managing attendance query and check-in/out mutations, with seamless offline queue fallbacks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import attendanceApi from '../api/attendanceApi';
import useOfflineStore from '../../../shared/store/offlineStore';
import { ClockInPayload, ClockOutPayload } from '../types';
import dayjs from 'dayjs';

export const useAttendance = () => {
  const queryClient = useQueryClient();
  const isConnected = useOfflineStore((state) => state.isConnected);
  const addToQueue = useOfflineStore((state) => state.addToQueue);

  // 1. Fetch today's check-in status
  const todayStatusQuery = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.fetchTodayStatus(),
    enabled: isConnected, // Only fetch from server if online
  });

  // 2. Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async (payload: ClockInPayload) => {
      if (!isConnected) {
        // Queue mutating request offline
        await addToQueue({
          url: '/api/v1/attendance',
          method: 'POST',
          data: payload,
          description: 'Clocking In',
        });
        return { id: 'offline-pending-in', status: 'Present', date: new Date().toISOString() } as any;
      }
      return attendanceApi.clockIn(payload);
    },
    onSuccess: () => {
      // Invalidate query to trigger visual refresh
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  // 3. Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ClockOutPayload }) => {
      if (!isConnected) {
        await addToQueue({
          url: `/api/v1/attendance/${id}`,
          method: 'PUT',
          data: payload,
          description: 'Clocking Out',
        });
        return { id, status: 'Present', checkOut: new Date().toISOString() } as any;
      }
      return attendanceApi.clockOut(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  return {
    todayRecord: todayStatusQuery.data,
    loadingStatus: todayStatusQuery.isLoading,
    refetchStatus: todayStatusQuery.refetch,
    
    clockIn: clockInMutation.mutateAsync,
    isClockingIn: clockInMutation.isPending,
    
    clockOut: clockOutMutation.mutateAsync,
    isClockingOut: clockOutMutation.isPending,
  };
};

import apiClient from '../../../shared/services/apiClient';

export const useAttendanceHistory = (month: string) => {
  const isConnected = useOfflineStore((state) => state.isConnected);
  // Widen from/to range to include adjacent month padding days in the calendar grid
  const from = month ? dayjs(`${month}-01`).startOf('month').subtract(7, 'day').format('YYYY-MM-DD') : '';
  const to = month ? dayjs(`${month}-01`).endOf('month').add(7, 'day').format('YYYY-MM-DD') : '';

  const historyQuery = useQuery({
    queryKey: ['attendance', 'history', month],
    queryFn: () => attendanceApi.fetchMonthRecords(from, to),
    enabled: isConnected && !!month,
  });

  const summaryQuery = useQuery({
    queryKey: ['attendance', 'summary', month],
    queryFn: () => attendanceApi.fetchSummary(month),
    enabled: isConnected && !!month,
  });

  const holidaysQuery = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/holidays');
      return response.data?.data || [];
    },
    enabled: isConnected,
  });

  const refetch = async () => {
    await Promise.all([historyQuery.refetch(), summaryQuery.refetch(), holidaysQuery.refetch()]);
  };

  return {
    records: historyQuery.data || [],
    isLoadingRecords: historyQuery.isLoading,
    refetchRecords: historyQuery.refetch,
    
    summary: summaryQuery.data,
    isLoadingSummary: summaryQuery.isLoading,
    refetchSummary: summaryQuery.refetch,

    holidays: holidaysQuery.data || [],
    isLoadingHolidays: holidaysQuery.isLoading,

    isError: historyQuery.isError || summaryQuery.isError || holidaysQuery.isError,
    error: (historyQuery.error || summaryQuery.error || holidaysQuery.error) as Error | null,
    isLoading: historyQuery.isLoading || summaryQuery.isLoading || holidaysQuery.isLoading,
    refetch,
  };
};

export default useAttendance;

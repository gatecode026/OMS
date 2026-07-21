/**
 * @file useLeaves.ts
 * @description TanStack React Query hooks for Leave Management module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import leavesApi from '../api/leavesApi';
import { LeaveRequest } from '../types';

export const useLeaveRequests = (employeeId?: string) => {
  return useQuery({
    queryKey: ['leaves', 'requests', employeeId],
    queryFn: () => leavesApi.fetchRequests(employeeId ? { employeeId } : undefined),
    staleTime: 30 * 1000,
    retry: 1,
  });
};

export const useLeavePolicies = () => {
  return useQuery({
    queryKey: ['leaves', 'policies'],
    queryFn: () => leavesApi.fetchPolicies(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LeaveRequest>) => leavesApi.createRequest(data),
    onSuccess: () => {
      // Invalidate queries to refresh leave dashboard
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useCancelLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, approverNotes }: { id: string; status: 'Approved' | 'Rejected' | 'Cancelled'; approverNotes?: string }) =>
      leavesApi.updateRequest(id, { status, approverNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

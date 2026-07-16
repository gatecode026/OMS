/**
 * @file useProfile.ts
 * @description React Query hooks for all profile data fetching in the Enterprise Profile module.
 *              Reuses existing apiClient, React Query, and offlineStore patterns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import profileApi from '../api/profileApi';
import useOfflineStore from '../../../shared/store/offlineStore';
import {
  EmployeeProfile,
  ProfileCompletenessResult,
} from '../types';

import { useAuthStore } from '../../../shared/store/authStore';

const STALE_PROFILE = 5 * 60 * 1000;   // 5 min
const STALE_STATIC  = 10 * 60 * 1000;  // 10 min

// ─── Main Profile ─────────────────────────────────────────────────────────────

export const useProfile = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['profile', userId || 'me'],
    queryFn: () => profileApi.fetchProfile(),
    enabled: isConnected,
    staleTime: STALE_PROFILE,
    refetchOnWindowFocus: true,
  });
};

// ─── Update Profile Photo Mutation ───────────────────────────────────────────

export const useUpdateProfilePhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, base64Image }: { employeeId: string; base64Image: string | null }) => {
      return profileApi.updateProfilePhoto(employeeId, base64Image);
    },
    onSuccess: () => {
      // Invalidate queries to refresh automatically
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

// ─── Bank Details ─────────────────────────────────────────────────────────────

export const useBankDetails = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['profile', 'bank-details'],
    queryFn: () => profileApi.fetchBankDetails(),
    enabled: isConnected,
    staleTime: STALE_STATIC,
  });
};

// ─── Emergency Contacts ───────────────────────────────────────────────────────

export const useEmergencyContacts = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['profile', 'emergency-contacts'],
    queryFn: () => profileApi.fetchEmergencyContacts(),
    enabled: isConnected,
    staleTime: STALE_STATIC,
  });
};

// ─── Documents ────────────────────────────────────────────────────────────────

export const useProfileDocuments = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['profile', 'documents'],
    queryFn: () => profileApi.fetchDocuments(),
    enabled: isConnected,
    staleTime: STALE_STATIC,
  });
};

// ─── Leave Summary ────────────────────────────────────────────────────────────

export const useLeaveSummary = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['profile', 'leave-summary'],
    queryFn: () => profileApi.fetchLeaveSummary(),
    enabled: isConnected,
    staleTime: STALE_PROFILE,
  });
};

// ─── Payroll ──────────────────────────────────────────────────────────────────

export const usePayroll = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['profile', 'payroll'],
    queryFn: () => profileApi.fetchPayroll(),
    enabled: isConnected,
    staleTime: STALE_STATIC,
  });
};

// ─── Profile Completeness (derived, no API call) ─────────────────────────────

export const useProfileCompleteness = (
  profile: EmployeeProfile | null | undefined
): ProfileCompletenessResult => {
  const hasPersonal = !!(
    profile?.name &&
    profile?.gender &&
    profile?.dateOfBirth &&
    profile?.bloodGroup
  );

  const hasProfessional = !!(
    profile?.designation &&
    profile?.department &&
    profile?.joiningDate &&
    profile?.employmentType
  );

  const hasContact = !!(
    profile?.email &&
    profile?.phone
  );

  const sections = [
    { label: 'Personal Information', complete: hasPersonal, weight: 40 },
    { label: 'Professional Information', complete: hasProfessional, weight: 30 },
    { label: 'Contact & Address Details', complete: hasContact, weight: 30 },
  ];

  const percentage = sections.reduce((acc, s) => {
    return acc + (s.complete ? s.weight : 0);
  }, 0);

  return { percentage, sections };
};

export default useProfile;

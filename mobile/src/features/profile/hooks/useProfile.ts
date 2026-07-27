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
import UserProfileManager from '../../../shared/services/UserProfileManager';

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
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: async ({ employeeId, base64Image }: { employeeId: string; base64Image: string | null }) => {
      return profileApi.updateProfilePhoto(employeeId, base64Image);
    },
    onSuccess: (data, variables) => {
      const newAvatarUrl = data?.profilePhoto || data?.avatarUrl || variables.base64Image || undefined;
      updateUser({
        avatar:    newAvatarUrl,
        avatarUrl: newAvatarUrl,
        photoUrl:  newAvatarUrl,
      });
      // Invalidate centralized UserProfileManager + AvatarCacheManager
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        UserProfileManager.invalidate(userId);
        // Re-seed with new URL immediately so all screens update without re-fetch
        if (newAvatarUrl) {
          UserProfileManager.cacheProfile({
            userId,
            name:         useAuthStore.getState().user?.name || '',
            avatarUrl:    newAvatarUrl,
            profilePhoto: newAvatarUrl,
          });
        }
      }
      // Invalidate React Query cache
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

// ─── Update Profile Mutation ──────────────────────────────────────────────────

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: async ({ employeeId, data }: { employeeId: string; data: any }) => {
      return profileApi.updateProfile(employeeId, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Sync global auth store
      const currentUserId = useAuthStore.getState().user?.id;
      if (data && data.id === currentUserId) {
        updateUser({
          name: data.name,
          avatarUrl: data.avatar || data.photoUrl,
          phone: data.phone,
          department: data.department,
          designation: data.designation,
        });
      }
    },
  });
};

// ─── Active Sessions & Devices Queries ───────────────────────────────────────

export const useActiveSessions = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['profile', 'sessions'],
    queryFn: () => profileApi.fetchSessions(),
    enabled: isConnected,
    staleTime: STALE_STATIC,
  });
};

export const useActiveDevices = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['profile', 'devices'],
    queryFn: () => profileApi.fetchDevices(),
    enabled: isConnected,
    staleTime: STALE_STATIC,
  });
};

// ─── Terminate Sessions Mutations ────────────────────────────────────────────

export const useTerminateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => profileApi.terminateSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'sessions'] });
    },
  });
};

export const useTerminateOtherSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keepId: string) => profileApi.terminateOtherSessions(keepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'sessions'] });
    },
  });
};

// ─── Profile Completeness (derived, no API call) ─────────────────────────────

export const useProfileCompleteness = (
  profile: EmployeeProfile | null | undefined
): {
  percentage: number;
  missingFields: string[];
  suggestions: string[];
} => {
  const hasBasicInfo = !!(
    profile?.name &&
    profile?.gender &&
    (profile?.dateOfBirth || profile?.dob) &&
    profile?.maritalStatus &&
    profile?.bloodGroup &&
    profile?.nationality
  );

  const hasPhoto = !!(
    profile?.avatar ||
    profile?.photoUrl ||
    profile?.avatarUrl ||
    profile?.profilePhoto
  );

  const hasAddress = !!(
    profile?.currentAddress &&
    profile?.permanentAddress
  );

  const hasEmergency = !!(
    profile?.emergencyContactName &&
    profile?.emergencyContactPhone &&
    profile?.emergencyContactRelation
  );

  const hasBank = !!(
    profile?.bankName &&
    profile?.bankAccountNumber &&
    profile?.bankIfscCode
  );

  const hasIdentity = !!(
    profile?.aadhaarNumber &&
    profile?.panNumber
  );

  const weights = {
    basicInfo: 20,
    photo: 15,
    address: 15,
    emergency: 15,
    bank: 15,
    identity: 20,
  };

  let percentage = 0;
  const missingFields: string[] = [];
  const suggestions: string[] = [];

  if (hasBasicInfo) percentage += weights.basicInfo;
  else {
    missingFields.push('Basic Information');
    suggestions.push('Complete basic info (gender, DOB, marital status, blood group, nationality)');
  }

  if (hasPhoto) percentage += weights.photo;
  else {
    missingFields.push('Profile Photo');
    suggestions.push('Upload a high-quality profile picture');
  }

  if (hasAddress) percentage += weights.address;
  else {
    missingFields.push('Address Details');
    suggestions.push('Add both current and permanent address details');
  }

  if (hasEmergency) percentage += weights.emergency;
  else {
    missingFields.push('Emergency Contact');
    suggestions.push('Provide name, relationship, and mobile for primary emergency contact');
  }

  if (hasBank) percentage += weights.bank;
  else {
    missingFields.push('Bank Details');
    suggestions.push('Add your salary bank account details (IFSC, Account Number)');
  }

  if (hasIdentity) percentage += weights.identity;
  else {
    missingFields.push('Identity Documents');
    suggestions.push('Save verified Aadhaar and PAN details');
  }

  return { percentage, missingFields, suggestions };
};

export default useProfile;

/**
 * @file profileApi.ts
 * @description API functions for the Enterprise Profile feature module.
 *              Uses the existing apiClient with JWT + tenant injection.
 *              All functions return null on 404 and throw on server errors.
 */

import apiClient from '../../../shared/services/apiClient';
import { useAuthStore } from '../../../shared/store/authStore';
import {
  EmployeeProfile,
  BankDetails,
  EmergencyContact,
  ProfileDocument,
  LeaveSummary,
  PayrollRecord,
} from '../types';

const parseAddressString = (addr: any) => {
  if (!addr) return { line1: '', city: '', state: '', country: 'India', postalCode: '' };
  if (typeof addr === 'object') {
    return {
      line1: addr.line1 || '',
      city: addr.city || '',
      state: addr.state || '',
      country: addr.country || 'India',
      postalCode: addr.postalCode || addr.pincode || addr.pinCode || '',
    };
  }
  const parts = String(addr).split(',').map((s) => s.trim());
  return {
    line1: parts[0] || '',
    city: parts[1] || '',
    state: parts[2] || '',
    country: parts[3] || 'India',
    postalCode: parts[4] || '',
  };
};

const addressToString = (addr: any) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [addr.line1, addr.city, addr.state, addr.country, addr.postalCode || addr.pinCode || addr.pincode]
    .filter(Boolean)
    .join(', ');
};

export const profileApi = {
  /**
   * Fetch the authenticated user's full profile.
   * Tries to fetch by user's specific employee ID first, then falls back to /profile or /me.
   */
  async fetchProfile(): Promise<EmployeeProfile | null> {
    let profile: any = null;
    try {
      const id = useAuthStore.getState().user?.id;
      if (id) {
        const response = await apiClient.get(`/api/v1/employees/${id}`);
        profile = response.data?.data || response.data || null;
      }
    } catch (err) {
      console.warn('Failed to fetch profile via employees endpoint:', err);
    }

    if (!profile) {
      try {
        const response = await apiClient.get('/api/v1/profile');
        profile = response.data?.data || response.data || null;
      } catch (err: any) {
        if (err?.statusCode === 404) {
          try {
            const fallback = await apiClient.get('/api/v1/me');
            profile = fallback.data?.data || fallback.data || null;
          } catch {
            profile = null;
          }
        } else {
          throw err;
        }
      }
    }

    if (profile) {
      profile.currentAddress = parseAddressString(profile.currentAddress);
      profile.permanentAddress = parseAddressString(profile.permanentAddress);
    }
    return profile;
  },

  /**
   * Fetch bank details for the authenticated employee.
   */
  async fetchBankDetails(): Promise<BankDetails | null> {
    try {
      const response = await apiClient.get('/api/v1/profile/bank-details');
      return response.data?.data || response.data || null;
    } catch (err: any) {
      if (err?.statusCode === 404) return null;
      throw err;
    }
  },

  /**
   * Fetch emergency contacts for the authenticated employee.
   */
  async fetchEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const response = await apiClient.get('/api/v1/profile/emergency-contacts');
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : (data ? [data] : []);
    } catch (err: any) {
      if (err?.statusCode === 404) return [];
      throw err;
    }
  },

  /**
   * Fetch uploaded documents for the authenticated employee.
   */
  async fetchDocuments(): Promise<ProfileDocument[]> {
    try {
      const response = await apiClient.get('/api/v1/profile/documents');
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err?.statusCode === 404) return [];
      throw err;
    }
  },

  /**
   * Fetch leave summary for the authenticated employee.
   * Tries /api/v1/leaves/summary first, then /api/v1/leaves.
   */
  async fetchLeaveSummary(): Promise<LeaveSummary | null> {
    try {
      const response = await apiClient.get('/api/v1/leaves/summary');
      return response.data?.data || response.data || null;
    } catch (err: any) {
      if (err?.statusCode === 404) {
        try {
          // Aggregate from raw list if summary endpoint missing
          const listRes = await apiClient.get('/api/v1/leaves');
          const list = listRes.data?.data || [];
          const pending = list.filter((l: any) => l.status?.toLowerCase() === 'pending').length;
          const approved = list.filter((l: any) => l.status?.toLowerCase() === 'approved').length;
          const rejected = list.filter((l: any) => l.status?.toLowerCase() === 'rejected').length;
          return {
            pendingCount: pending,
            approvedCount: approved,
            rejectedCount: rejected,
            totalApplied: list.length,
          };
        } catch {
          return null;
        }
      }
      throw err;
    }
  },

  /**
   * Fetch payroll records for the authenticated employee.
   */
  async fetchPayroll(): Promise<PayrollRecord[]> {
    try {
      const response = await apiClient.get('/api/v1/payroll/my-payroll');
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err?.statusCode === 404) {
        try {
          const fallback = await apiClient.get('/api/v1/payroll');
          const data = fallback.data?.data || fallback.data;
          return Array.isArray(data) ? data : [];
        } catch {
          return [];
        }
      }
      throw err;
    }
  },

  /**
   * Update profile picture by sending base64 data to employee update endpoint.
   */
  async updateProfilePhoto(employeeId: string, base64Image: string | null): Promise<EmployeeProfile> {
    const response = await apiClient.put(`/api/v1/employees/${employeeId}`, {
      avatar: base64Image,
      photoUrl: base64Image,
    });
    return response.data?.data || response.data;
  },

  /**
   * Update profile details.
   */
  async updateProfile(employeeId: string, data: any): Promise<EmployeeProfile> {
    const payload = { ...data };
    if (payload.currentAddress) {
      payload.currentAddress = addressToString(payload.currentAddress);
    }
    if (payload.permanentAddress) {
      payload.permanentAddress = addressToString(payload.permanentAddress);
    }
    const response = await apiClient.put(`/api/v1/employees/${employeeId}`, payload);
    const updated = response.data?.data || response.data;
    if (updated) {
      updated.currentAddress = parseAddressString(updated.currentAddress);
      updated.permanentAddress = parseAddressString(updated.permanentAddress);
    }
    return updated;
  },

  /**
   * Fetch active login sessions.
   */
  async fetchSessions(): Promise<any[]> {
    const response = await apiClient.get('/api/v1/security/sessions');
    return response.data?.data || response.data || [];
  },

  /**
   * Fetch trusted devices.
   */
  async fetchDevices(): Promise<any[]> {
    const response = await apiClient.get('/api/v1/security/devices');
    return response.data?.data || response.data || [];
  },

  /**
   * Terminate a specific session.
   */
  async terminateSession(sessionId: string): Promise<any> {
    const response = await apiClient.delete(`/api/v1/security/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Terminate all other sessions except current.
   */
  async terminateOtherSessions(keepId: string): Promise<any> {
    const response = await apiClient.post('/api/v1/security/sessions/terminate-others', { keepId });
    return response.data;
  },
};

export default profileApi;

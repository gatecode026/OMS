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

export const profileApi = {
  /**
   * Fetch the authenticated user's full profile.
   * Tries to fetch by user's specific employee ID first, then falls back to /profile or /me.
   */
  async fetchProfile(): Promise<EmployeeProfile | null> {
    try {
      const id = useAuthStore.getState().user?.id;
      if (id) {
        const response = await apiClient.get(`/api/v1/employees/${id}`);
        return response.data?.data || response.data || null;
      }
    } catch (err) {
      console.warn('Failed to fetch profile via employees endpoint:', err);
    }

    try {
      const response = await apiClient.get('/api/v1/profile');
      return response.data?.data || response.data || null;
    } catch (err: any) {
      if (err?.statusCode === 404) {
        try {
          const fallback = await apiClient.get('/api/v1/me');
          return fallback.data?.data || fallback.data || null;
        } catch {
          return null;
        }
      }
      throw err;
    }
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
};

export default profileApi;

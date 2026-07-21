/**
 * @file leavesApi.ts
 * @description API client calls for Leave Management module using shared apiClient.
 */

import apiClient from '../../../shared/services/apiClient';
import { LeaveRequest, LeavePolicy } from '../types';

export const leavesApi = {
  /**
   * Fetch leave requests with query filters
   */
  async fetchRequests(params?: {
    employeeId?: string;
    status?: string;
    type?: string;
    department?: string;
    search?: string;
  }): Promise<LeaveRequest[]> {
    const response = await apiClient.get('/api/v1/leaves', { params });
    return response.data?.data || [];
  },

  /**
   * Fetch active leave policies
   */
  async fetchPolicies(): Promise<LeavePolicy[]> {
    const response = await apiClient.get('/api/v1/leaves/policies');
    return response.data?.data || [];
  },

  /**
   * Submit a new leave request (Apply Leave)
   */
  async createRequest(data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const response = await apiClient.post('/api/v1/leaves', data);
    return response.data?.data;
  },

  /**
   * Update an existing leave request (e.g. cancel/withdraw request by updating status)
   */
  async updateRequest(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const response = await apiClient.put(`/api/v1/leaves/${id}`, data);
    return response.data?.data;
  },
};

export default leavesApi;

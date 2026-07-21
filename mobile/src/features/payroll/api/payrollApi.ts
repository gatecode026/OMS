/**
 * @file payrollApi.ts
 * @description API client calls for Payroll & Payslip module using shared apiClient.
 */

import apiClient from '../../../shared/services/apiClient';
import { PayrollRecord } from '../../profile/types';

export interface PayrollAllResponse {
  grades: any[];
  reimbursements: any[];
  loans: any[];
  advances: any[];
  bonuses: any[];
  payments: PayrollRecord[];
  config: any;
}

export const payrollApi = {
  /**
   * Fetch all payroll master data (payments, loans, bonuses, etc.) for the authenticated user.
   * For employees, this is scoped by the backend to return only their own payments.
   */
  async fetchPayrollAll(): Promise<PayrollAllResponse> {
    const response = await apiClient.get('/api/v1/payroll/all');
    return response.data?.data || response.data || { payments: [] };
  },

  /**
   * Request pdf copy of the processed payslip.
   * If not implemented, listing/detail screens will handle it gracefully.
   */
  async downloadPayslipPdf(id: string): Promise<any> {
    return apiClient.get(`/api/v1/payroll/payments/${id}/pdf`, {
      responseType: 'blob',
    });
  },
};

export default payrollApi;

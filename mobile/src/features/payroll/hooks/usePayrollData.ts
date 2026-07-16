/**
 * @file usePayrollData.ts
 * @description TanStack React Query hooks for Payroll & Payslip module.
 */

import { useQuery } from '@tanstack/react-query';
import payrollApi from '../api/payrollApi';

export const useMyPayroll = () => {
  return useQuery({
    queryKey: ['payroll', 'all'],
    queryFn: async () => {
      const res = await payrollApi.fetchPayrollAll();
      // Ensure we sort payments by year and month desc
      const payments = res.payments || [];
      
      const monthOrder: { [key: string]: number } = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };

      const sortedPayments = [...payments].sort((a, b) => {
        const yearA = parseInt(a.year || '0');
        const yearB = parseInt(b.year || '0');
        if (yearA !== yearB) return yearB - yearA;
        const monthA = monthOrder[a.month || ''] ?? 0;
        const monthB = monthOrder[b.month || ''] ?? 0;
        return monthB - monthA;
      });

      return {
        ...res,
        payments: sortedPayments,
      };
    },
    staleTime: 60 * 1000,
    retry: 1,
  });
};

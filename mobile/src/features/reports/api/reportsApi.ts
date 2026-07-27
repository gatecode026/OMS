/**
 * @file src/features/reports/api/reportsApi.ts
 * @description API service for Reports & Documents module fetching real backend database metrics.
 */

import apiClient from '../../../shared/services/apiClient';

export interface ReportSummaryCard {
  value: number | string;
  trend: string;
  comparison: string;
  trendType: 'up' | 'down';
  color?: string;
}

export interface ReportsDashboardData {
  summaryCards: {
    totalReports: ReportSummaryCard;
    scheduled: ReportSummaryCard;
    pending: ReportSummaryCard;
    completionRate: ReportSummaryCard;
  };
  stats: {
    departmentsCount: number;
    employeesCount: number;
    tasksCount: number;
    completedReports: number;
  };
}

export interface PerformanceChartData {
  period: string;
  chartType: string;
  maxValue: number;
  data: { label: string; value: number; target?: number }[];
}

export interface DepartmentAnalytics {
  totalTeams: number;
  departments: { id: string; name: string; teamsCount: number; percentage: number; color: string }[];
}

export interface ReportFileItem {
  id: string;
  title: string;
  category: string;
  timeAgo: string;
  size: string;
  iconType: 'file' | 'table' | 'building' | 'pdf' | 'word' | 'excel' | 'zip';
  color?: string;
  bgColor?: string;
  status: 'Completed' | 'Pending' | 'Draft';
  downloadUrl?: string;
  fileExtension?: string;
  updatedAt?: string;
}

export interface DocumentCategoryItem {
  id: string;
  title: string;
  fileCount: number;
  icon: string;
  color: string;
  bgColor: string;
}

export const reportsApi = {
  fetchDashboardSummary: async (): Promise<ReportsDashboardData> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/dashboard');
      return response.data?.data || response.data;
    } catch {
      return {
        summaryCards: {
          totalReports: { value: 0, trend: '0%', comparison: 'vs last month', trendType: 'up', color: '#3B82F6' },
          scheduled: { value: 0, trend: '0%', comparison: 'vs last month', trendType: 'up', color: '#8B5CF6' },
          pending: { value: 0, trend: '0%', comparison: 'vs last month', trendType: 'down', color: '#EF4444' },
          completionRate: { value: '0%', trend: '0%', comparison: 'vs last month', trendType: 'up', color: '#10B981' },
        },
        stats: { departmentsCount: 0, employeesCount: 0, tasksCount: 0, completedReports: 0 },
      };
    }
  },

  fetchPerformance: async (period = 'yearly'): Promise<PerformanceChartData> => {
    try {
      const response = await apiClient.get(`/api/v1/analytics/performance?period=${period}`);
      return response.data?.data || response.data;
    } catch {
      return {
        period: 'yearly',
        chartType: 'bar',
        maxValue: 10,
        data: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG'].map((label) => ({ label, value: 0 })),
      };
    }
  },

  fetchDepartmentAnalytics: async (): Promise<DepartmentAnalytics> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/departments');
      return response.data?.data || response.data;
    } catch {
      return {
        totalTeams: 0,
        departments: [],
      };
    }
  },

  fetchRecentReports: async (category = 'All'): Promise<ReportFileItem[]> => {
    try {
      const response = await apiClient.get(`/api/v1/analytics/reports?category=${category}`);
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  fetchDocumentCategories: async (): Promise<DocumentCategoryItem[]> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/departments');
      const depts = response.data?.data?.departments || [];
      if (depts.length > 0) {
        return depts.map((d: any, idx: number) => ({
          id: d.id || String(idx),
          title: `${d.name} Docs`,
          fileCount: d.teamsCount || 0,
          icon: 'folder-open',
          color: d.color || '#4F46E5',
          bgColor: '#EEF2FF',
        }));
      }
    } catch {
      // ignore
    }
    return [];
  },

  fetchAllFiles: async (): Promise<ReportFileItem[]> => {
    try {
      const response = await apiClient.get('/api/v1/analytics/reports?category=All');
      return response.data?.data || [];
    } catch {
      return [];
    }
  },
};

export default reportsApi;

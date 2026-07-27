/**
 * @file src/features/analytics/types/index.ts
 * @description Types and interfaces for Analytics feature module.
 */

export interface SummaryCardMetric {
  value: number | string;
  trend: string;
  comparison: string;
  trendType: 'up' | 'down' | 'neutral';
  color?: string;
}

export interface DashboardSummary {
  summaryCards: {
    totalReports: SummaryCardMetric;
    scheduled: SummaryCardMetric;
    pending: SummaryCardMetric;
    completionRate: SummaryCardMetric;
  };
  stats: {
    departmentsCount: number;
    employeesCount: number;
    tasksCount: number;
    completedReports: number;
  };
}

export interface PerformanceBarData {
  label: string;
  value: number;
  target?: number;
}

export interface PerformanceOverviewData {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  chartType: 'bar' | 'line' | 'area';
  maxValue: number;
  data: PerformanceBarData[];
}

export interface DepartmentMetric {
  id: string;
  name: string;
  teamsCount: number;
  percentage: number;
  color: string;
}

export interface DepartmentAnalyticsData {
  totalTeams: number;
  departments: DepartmentMetric[];
}

export interface RecentReportItem {
  id: string;
  title: string;
  category: string;
  timeAgo: string;
  size: string;
  iconType: 'file' | 'table' | 'building' | 'users';
  color?: string;
  bgColor?: string;
  status: 'Completed' | 'Pending' | 'Draft';
  downloadUrl?: string;
}

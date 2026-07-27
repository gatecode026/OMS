/**
 * @file src/features/reports/hooks/useReports.ts
 * @description React Query hooks for fetching reports and documents overview.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import reportsApi from '../api/reportsApi';
import useOfflineStore from '../../../shared/store/offlineStore';

export const useReports = (selectedCategory = 'All', period = 'yearly') => {
  const isConnected = useOfflineStore((state) => state.isConnected);

  const summaryQuery = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportsApi.fetchDashboardSummary(),
    enabled: isConnected,
    refetchOnWindowFocus: true,
  });

  const performanceQuery = useQuery({
    queryKey: ['reports', 'performance', period],
    queryFn: () => reportsApi.fetchPerformance(period),
    enabled: isConnected,
  });

  const departmentsQuery = useQuery({
    queryKey: ['reports', 'departments'],
    queryFn: () => reportsApi.fetchDepartmentAnalytics(),
    enabled: isConnected,
  });

  const recentReportsQuery = useQuery({
    queryKey: ['reports', 'recent', selectedCategory],
    queryFn: () => reportsApi.fetchRecentReports(selectedCategory),
    enabled: isConnected,
  });

  const documentCategoriesQuery = useQuery({
    queryKey: ['documents', 'categories'],
    queryFn: () => reportsApi.fetchDocumentCategories(),
    enabled: isConnected,
  });

  const allFilesQuery = useQuery({
    queryKey: ['documents', 'allFiles'],
    queryFn: () => reportsApi.fetchAllFiles(),
    enabled: isConnected,
  });

  return {
    summary: summaryQuery.data,
    loadingSummary: summaryQuery.isLoading,

    performance: performanceQuery.data,
    loadingPerformance: performanceQuery.isLoading,

    departments: departmentsQuery.data,
    loadingDepartments: departmentsQuery.isLoading,

    recentReports: recentReportsQuery.data || [],
    loadingRecentReports: recentReportsQuery.isLoading,

    categories: documentCategoriesQuery.data || [],
    loadingCategories: documentCategoriesQuery.isLoading,

    allFiles: allFilesQuery.data || [],
    loadingAllFiles: allFilesQuery.isLoading,

    refetchAll: () => {
      summaryQuery.refetch();
      performanceQuery.refetch();
      departmentsQuery.refetch();
      recentReportsQuery.refetch();
      documentCategoriesQuery.refetch();
      allFilesQuery.refetch();
    },
  };
};

export default useReports;

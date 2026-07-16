/**
 * @file useProjectsData.ts
 * @description React Query hooks for fetching project lists and detail documents with 403 authorization fallbacks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectsApi from '../api/projectsApi';
import useOfflineStore from '../../../shared/store/offlineStore';
import { Project } from '../types';

const STALE_PROJECTS = 30 * 1000; // 30s caching

/**
 * Hook to retrieve all projects accessible to the current logged-in employee.
 */
export const useProjects = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => projectsApi.fetchProjects(),
    enabled: isConnected,
    staleTime: STALE_PROJECTS,
  });
};

/**
 * Hook to retrieve a single project's details.
 * Implements fallback lookup if GET /projects/:id returns 403 Forbidden.
 */
export const useProjectDetails = (projectId: string) => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  return useQuery({
    queryKey: ['projects', 'detail', projectId],
    queryFn: async (): Promise<Project | null> => {
      if (!projectId) return null;
      try {
        const detail = await projectsApi.fetchProjectDetail(projectId);
        if (detail) return detail;
      } catch (err: any) {
        console.warn(`Direct fetch for project ${projectId} failed. Trying list lookup fallback...`, err);
      }
      // Fallback: Fetch list and lookup in-memory
      const list = await projectsApi.fetchProjects();
      return list.find((p) => p.id === projectId) || null;
    },
    enabled: isConnected && !!projectId,
    staleTime: STALE_PROJECTS,
  });
};

/**
 * Mutation hook to update a project's subdocuments (checklist, progress, comments).
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, updatedFields }: { projectId: string; updatedFields: any }) => {
      return projectsApi.updateProject(projectId, updatedFields);
    },
    onSuccess: (_, variables) => {
      // Invalidate both details and project list to sync dashboard views
      queryClient.invalidateQueries({ queryKey: ['projects', 'detail', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'list'] });
    },
  });
};

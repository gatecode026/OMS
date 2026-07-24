/**
 * @file projectsApi.ts
 * @description API service methods for the Projects module.
 */

import apiClient from '../../../shared/services/apiClient';
import { Project } from '../types';

export const projectsApi = {
  /**
   * Fetch all projects that the employee has access to (is a member of or dept match).
   */
  async fetchProjects(): Promise<Project[]> {
    const response = await apiClient.get('/api/v1/projects');
    return response.data?.data || response.data || [];
  },

  /**
   * Fetch a single project detail by ID.
   */
  async fetchProjectDetail(projectId: string): Promise<Project | null> {
    const response = await apiClient.get(`/api/v1/projects/${projectId}`);
    return response.data?.data || response.data || null;
  },

  /**
   * Update project task (comments, checklist status updates).
   */
  async updateProject(projectId: string, updatedFields: any): Promise<Project | null> {
    const response = await apiClient.put(`/api/v1/projects/${projectId}`, updatedFields);
    return response.data?.data || response.data || null;
  },
};

export default projectsApi;

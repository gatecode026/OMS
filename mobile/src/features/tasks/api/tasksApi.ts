/**
 * @file tasksApi.ts
 * @description API client requests for Tasks module using shared apiClient.
 */

import apiClient from '../../../shared/services/apiClient';
import { TaskItem } from '../types';

export const tasksApi = {
  /**
   * Fetch all tasks from the individual tasks collection.
   * Scoped by the backend to return only the employee's assigned tasks.
   */
  async fetchTasks(month?: number, year?: number): Promise<TaskItem[]> {
    const response = await apiClient.get('/api/v1/tasks', {
      params: { month, year }
    });
    return response.data?.data || response.data || [];
  },

  /**
   * Fetch all projects from the projects collection.
   * Scoped by the backend to projects the employee is a member of.
   */
  async fetchProjects(): Promise<any[]> {
    const response = await apiClient.get('/api/v1/projects');
    return response.data?.data || response.data || [];
  },

  /**
   * Fetch a single project by ID to retrieve the latest subdocument task details
   * (comments, attachments, activityLog).
   */
  async fetchProjectDetail(projectId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/projects/${projectId}`);
    return response.data?.data || response.data || null;
  },

  /**
   * Update the project's task list (status, progress, checklist, comments, attachments)
   * by updating the parent Project document.
   */
  async updateProject(projectId: string, updatedFields: any): Promise<any> {
    const response = await apiClient.put(`/api/v1/projects/${projectId}`, updatedFields);
    return response.data?.data || response.data || null;
  },

  /**
   * Sync task status to the individual tasks collection.
   */
  async syncTaskStatus(taskId: string, status: string): Promise<any> {
    const response = await apiClient.put(`/api/v1/tasks/${taskId}`, { status });
    return response.data?.data || response.data || null;
  },
};

export default tasksApi;

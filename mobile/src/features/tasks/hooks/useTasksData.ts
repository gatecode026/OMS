/**
 * @file useTasksData.ts
 * @description React Query hooks for Tasks module.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import tasksApi from '../api/tasksApi';
import { TaskItem, TasksSummary, TaskComment } from '../types';
import useAuthStore from '../../../shared/store/authStore';

export const useMyTasks = (month?: number, year?: number) => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['tasks', 'list', user?.id, month, year],
    queryFn: async () => {
      if (!user) return { tasks: [], summary: getEmptySummary() };

      const [rawTasks, projects] = await Promise.all([
        tasksApi.fetchTasks(month, year),
        tasksApi.fetchProjects(),
      ]);

      // Map project details (name, code, id) to each task by searching project tasks list
      const mappedTasks: TaskItem[] = rawTasks.map((task) => {
        const parentProject = projects.find((proj) =>
          proj.tasks?.some((t: any) => t.id === task.id)
        );

        if (parentProject) {
          const projectTask = parentProject.tasks.find((t: any) => t.id === task.id);
          return {
            ...task,
            projectId: parentProject.id,
            projectName: parentProject.name,
            projectCode: parentProject.projectCode,
            description: projectTask?.description || task.description || '',
            estimatedHours: projectTask?.estimatedHours || 0,
            progress: projectTask?.progress || 0,
            remarks: projectTask?.remarks || '',
            comments: projectTask?.comments || [],
            attachments: projectTask?.attachments || [],
            activityLog: projectTask?.activityLog || [],
            assignedById: projectTask?.assignedById || task.assignedById,
            assignedByName: projectTask?.assignedByName || task.assignedByName,
            createdAt: projectTask?.createdAt || task.createdAt,
          };
        }

        const parts = task.id.split('-');
        const parsedProjectId = parts.length >= 3 ? `${parts[1]}-${parts[2]}` : 'PRJ-001';
        return {
          ...task,
          projectId: parsedProjectId,
          projectName: 'OMS',
          projectCode: 'OMS',
        };
      });

      // Filter tasks assigned to current employee
      const employeeTasks = mappedTasks.filter(
        (t) => t.assigneeId === user.id
      );

      // Compute summary metrics
      const summary = computeSummary(employeeTasks);

      return {
        tasks: employeeTasks,
        summary,
      };
    },
    staleTime: 30 * 1000,
  });
};

export const useTaskDetails = (projectId: string, taskId: string) => {
  return useQuery({
    queryKey: ['tasks', 'detail', projectId, taskId],
    queryFn: async () => {
      if (!projectId || !taskId) return null;

      const projects = await tasksApi.fetchProjects();
      const project = projects.find((p: any) => p.id === projectId);
      if (!project) return null;

      const task = project.tasks?.find((t: any) => t.id === taskId);
      if (!task) return null;

      return {
        ...task,
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        startDate: project.startDate,
        projectDeadline: project.deadline,
      } as TaskItem;
    },
    staleTime: 5 * 1000, // lower stale time for detail view to get instant comments
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      status,
    }: {
      projectId: string;
      taskId: string;
      status: string;
    }) => {
      const projects = await tasksApi.fetchProjects();
      const project = projects.find((p: any) => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const completed =
        status === 'Done' || status === 'done' || status === 'Completed' || status === 'completed';

      const updatedTasks = project.tasks.map((t: any) => {
        if (t.id === taskId) {
          return {
            ...t,
            status,
            completed,
            progress: completed ? 100 : t.progress || 0,
            activityLog: [
              ...(t.activityLog || []),
              {
                id: `act-${Math.random().toString(36).substring(2, 9)}`,
                action: 'status_updated',
                details: `Status set to ${status}`,
                timestamp: new Date().toISOString(),
                userName: user?.name || 'System',
              },
            ],
          };
        }
        return t;
      });

      const tasksDone = updatedTasks.filter((t: any) => t.completed).length;
      const progressTotal =
        project.tasksTotal > 0
          ? Math.round((tasksDone / project.tasksTotal) * 100)
          : 0;

      // 1. Update Project
      await tasksApi.updateProject(projectId, {
        tasks: updatedTasks,
        tasksDone,
        progress: progressTotal,
        status: progressTotal === 100 ? 'Completed' : project.status,
      });

      // 2. Sync to Task collection (in parallel/background)
      try {
        await tasksApi.syncTaskStatus(taskId, status);
      } catch (err) {
        console.warn('Failed to sync status to tasks collection', err);
      }

      return { projectId, taskId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'detail', variables.projectId, variables.taskId],
      });
    },
  });
};

export const useUpdateTaskProgress = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      progress,
      status,
      remarks,
    }: {
      projectId: string;
      taskId: string;
      progress: number;
      status: string;
      remarks?: string;
    }) => {
      const projects = await tasksApi.fetchProjects();
      const project = projects.find((p: any) => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const completed = progress === 100;

      const updatedTasks = project.tasks.map((t: any) => {
        if (t.id === taskId) {
          return {
            ...t,
            progress,
            status,
            completed,
            remarks: remarks || t.remarks || '',
            activityLog: [
              ...(t.activityLog || []),
              {
                id: `act-${Math.random().toString(36).substring(2, 9)}`,
                action: 'progress_updated',
                details: `Progress set to ${progress}% (Status: ${status})`,
                timestamp: new Date().toISOString(),
                userName: user?.name || 'System',
              },
            ],
          };
        }
        return t;
      });

      const tasksDone = updatedTasks.filter((t: any) => t.completed).length;
      const progressTotal =
        project.tasksTotal > 0
          ? Math.round((tasksDone / project.tasksTotal) * 100)
          : 0;

      await tasksApi.updateProject(projectId, {
        tasks: updatedTasks,
        tasksDone,
        progress: progressTotal,
        status: progressTotal === 100 ? 'Completed' : project.status,
      });

      try {
        await tasksApi.syncTaskStatus(taskId, status);
      } catch (err) {
        console.warn('Failed to sync progress to tasks collection', err);
      }

      return { projectId, taskId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'detail', variables.projectId, variables.taskId],
      });
    },
  });
};

export const useAddTaskComment = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      text,
    }: {
      projectId: string;
      taskId: string;
      text: string;
    }) => {
      const projects = await tasksApi.fetchProjects();
      const project = projects.find((p: any) => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const newComment: TaskComment = {
        id: `c-${Math.random().toString(36).substring(2, 9)}`,
        sender: user?.name || 'Unknown',
        role: user?.role || 'Employee',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedTasks = project.tasks.map((t: any) => {
        if (t.id === taskId) {
          return {
            ...t,
            comments: [...(t.comments || []), newComment],
            activityLog: [
              ...(t.activityLog || []),
              {
                id: `act-${Math.random().toString(36).substring(2, 9)}`,
                action: 'comment_added',
                details: `Comment added by ${newComment.sender}`,
                timestamp: new Date().toISOString(),
                userName: newComment.sender,
              },
            ],
          };
        }
        return t;
      });

      await tasksApi.updateProject(projectId, { tasks: updatedTasks });
      return { projectId, taskId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'detail', variables.projectId, variables.taskId],
      });
    },
  });
};

// Helper to compute summary statistics
function computeSummary(tasks: TaskItem[]): TasksSummary {
  const total = tasks.length;
  if (total === 0) return getEmptySummary();

  const completed = tasks.filter(
    (t) => t.completed || t.status === 'Completed' || t.status === 'Done'
  ).length;

  const inProgress = tasks.filter(
    (t) => t.status === 'In Progress'
  ).length;

  const pending = tasks.filter(
    (t) =>
      t.status === 'Pending' ||
      t.status === 'Pending Acceptance' ||
      t.status === 'To Do' ||
      t.status === 'Backlog'
  ).length;

  const overdue = tasks.filter(
    (t) =>
      t.overdue ||
      (t.dueDate && new Date(t.dueDate) < new Date() && !t.completed)
  ).length;

  const completionRate = Math.round((completed / total) * 100);

  return {
    total,
    pending,
    inProgress,
    completed,
    overdue,
    completionRate,
  };
}

function getEmptySummary(): TasksSummary {
  return {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0,
  };
}

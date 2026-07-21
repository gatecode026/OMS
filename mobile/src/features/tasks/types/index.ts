/**
 * @file index.ts
 * @description Type definitions for the Tasks module.
 */

export interface TaskComment {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: string;
  url: string;
}

export interface TaskActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  userName: string;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: string;
  assigneeId: string;
  assigneeName: string;
  description?: string;
  estimatedHours?: number;
  progress?: number;
  remarks?: string;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  approvals?: any[];
  activityLog?: TaskActivityLog[];
  overdue?: boolean;
  startDate?: string;
  
  // Project relations resolved from cache mapping
  projectId?: string;
  projectName?: string;
  projectCode?: string;
  assignedById?: string;
  assignedByName?: string;
  createdAt?: string;
}

export interface TasksSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

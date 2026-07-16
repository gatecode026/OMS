/**
 * @file types.ts
 * @description Type definitions for the Enterprise Projects module.
 */

export interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  description?: string;
  estimatedHours?: number;
  remarks?: string;
  comments?: Array<{
    id: string;
    sender: string;
    role: string;
    text: string;
    time: string;
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    size: string;
    url: string;
  }>;
  activityLog?: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
    userName: string;
  }>;
}

export interface ProjectDocument {
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  downloadUrl: string;
}

export interface Project {
  _id?: string;
  id: string;
  name: string;
  projectCode: string;
  description: string;
  department: string;
  branch?: string;
  client: string;
  manager: string;
  leader: string;
  members: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  startDate: string;
  deadline: string;
  progress: number;
  status: 'Planning' | 'In Progress' | 'Active' | 'Completed' | 'On Hold' | 'Delayed' | 'Pending' | 'Cancelled';
  tasksTotal: number;
  tasksDone: number;
  budget?: number;
  workflowStage?: string;
  pendingApprovals?: number;
  delayedActivities?: number;
  productivityScore?: number;
  workingHours?: number;
  milestonesCompleted?: number;
  milestonesTotal?: number;
  documents: ProjectDocument[];
  tasks: ProjectTask[];
  createdAt?: string;
  updatedAt?: string;
}

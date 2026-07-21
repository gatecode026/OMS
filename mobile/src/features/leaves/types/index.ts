/**
 * @file index.ts
 * @description TypeScript types for Leave Management module.
 */

export interface LeaveRequestHistory {
  date: string;
  status: string;
  comment: string;
  _id?: string;
}

export interface LeaveRequest {
  id: string;
  _id?: string;
  isPolicy?: boolean;
  employeeId: string;
  employeeName: string;
  department: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  appliedDate: string;
  approverNotes?: string;
  history?: LeaveRequestHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LeavePolicy {
  id: string;
  _id?: string;
  isPolicy: boolean;
  leaveCode: string;
  leaveName: string;
  defaultDays: number;
  maxCarryForward: number;
  isActive: boolean;
  description: string;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveSummaryStats {
  availableBalance: number;
  leavesUsed: number;
  pendingApproval: number;
  approvedFilings: number;
}

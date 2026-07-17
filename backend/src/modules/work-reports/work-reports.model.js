/**
 * @file src/modules/work-reports/work-reports.model.js
 * @description Mongoose schema definition for Daily Work Reports module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const editHistoryEntrySchema = new mongoose.Schema({
  editedBy: { type: String, required: true },
  editedAt: { type: String, required: true },
  changedFields: { type: [String], default: [] },
  previousValues: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const approvalHistoryEntrySchema = new mongoose.Schema({
  role: String,
  user: String,
  action: String,
  timestamp: String,
  comments: String
}, { _id: false });

const workReportSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  department: {
    type: String,
    required: true
  },
  team: {
    type: String,
    default: ''
  },
  project: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  tasksAssigned: {
    type: Number,
    required: true,
    default: 0
  },
  tasksCompleted: {
    type: Number,
    required: true,
    default: 0
  },
  pendingTasksCount: {
    type: Number,
    default: 0
  },
  summary: {
    type: String,
    required: true
  },
  ongoingTasks: {
    type: String,
    default: ''
  },
  pendingTasks: {
    type: String,
    default: ''
  },
  majorAccomplishments: {
    type: String,
    required: true
  },
  challengesFaced: {
    type: String,
    default: ''
  },
  supportRequired: {
    type: String,
    default: ''
  },
  loginTime: {
    type: String,
    default: ''
  },
  logoutTime: {
    type: String,
    default: ''
  },
  workingHours: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  plannedTasksTomorrow: {
    type: String,
    default: ''
  },
  expectedDeliverablesTomorrow: {
    type: String,
    default: ''
  },
  priorityTasksTomorrow: {
    type: String,
    default: 'Medium'
  },
  attachments: {
    type: [String],
    default: []
  },
  completedTaskIds: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Changes Requested', 'Rejected', 'Needs Revision', 'Escalated', 'Under Process'],
    default: 'Submitted'
  },
  submittedTime: {
    type: String,
    default: ''
  },
  productivityScore: {
    type: Number,
    default: 0
  },
  feedback: {
    type: String,
    default: ''
  },
  // Review & Approval fields
  reviewedBy: {
    type: String,
    default: ''
  },
  approvalDate: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  // Version tracking
  version: {
    type: Number,
    default: 1
  },
  lastEditedAt: {
    type: String,
    default: ''
  },
  draftAutoSavedAt: {
    type: String,
    default: ''
  },
  // History arrays
  editHistory: {
    type: [editHistoryEntrySchema],
    default: []
  },
  approvalHistory: {
    type: [approvalHistoryEntrySchema],
    default: []
  }
}, {
  timestamps: true,
  collection: 'work_reports'
});

// Compound index: one report per employee per day per company
workReportSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });

workReportSchema.plugin(tenantPlugin);

const WorkReport = mongoose.model('WorkReport', workReportSchema);

export default WorkReport;

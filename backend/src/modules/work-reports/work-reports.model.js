/**
 * @file src/modules/work-reports/work-reports.model.js
 * @description Mongoose schema definition for Daily Work Reports module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

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
  status: {
    type: String,
    enum: ['Submitted', 'Approved', 'Changes Requested', 'Escalated', 'Rejected'],
    default: 'Submitted'
  },
  submittedTime: {
    type: String,
    required: true
  },
  productivityScore: {
    type: Number,
    default: 0
  },
  feedback: {
    type: String,
    default: ''
  },
  approvalHistory: [{
    role: String,
    user: String,
    action: String,
    timestamp: String,
    comments: String
  }]
}, {
  timestamps: true,
  collection: 'work_reports'
});

workReportSchema.plugin(tenantPlugin);

const WorkReport = mongoose.model('WorkReport', workReportSchema);

export default WorkReport;

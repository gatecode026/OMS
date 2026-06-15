/**
 * @file src/modules/projects/projects.model.js
 * @description Mongoose schema definition for Projects module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const projectSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  projectCode: {
    type: String,
    sparse: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    required: true
  },
  client: {
    type: String,
    default: 'Internal'
  },
  manager: {
    type: String,
    required: true
  },
  leader: {
    type: String,
    required: true
  },
  members: {
    type: [String],
    default: []
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  startDate: {
    type: String,
    required: true
  },
  deadline: {
    type: String,
    required: true
  },
  progress: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Planning', 'In Progress', 'Active', 'Completed', 'On Hold', 'Delayed', 'Pending'],
    default: 'Planning'
  },
  tasksTotal: {
    type: Number,
    default: 0
  },
  tasksDone: {
    type: Number,
    default: 0
  },
  budget: {
    type: Number,
    default: 0
  },
  workflowStage: {
    type: String,
    default: 'Planning'
  },
  pendingApprovals: {
    type: Number,
    default: 0
  },
  delayedActivities: {
    type: Number,
    default: 0
  },
  productivityScore: {
    type: Number,
    default: 80
  },
  workingHours: {
    type: Number,
    default: 0
  },
  milestonesCompleted: {
    type: Number,
    default: 0
  },
  milestonesTotal: {
    type: Number,
    default: 0
  },
  documents: [{
    name: String,
    type: { type: String },
    size: String,
    uploadedBy: String,
    downloadUrl: String
  }],
  tasks: [{
    id: String,
    title: String,
    completed: {
      type: Boolean,
      default: false
    },
    dueDate: String,
    priority: String,
    overdue: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      default: 'To Do'
    },
    assigneeId: {
      type: String,
      default: ''
    },
    assigneeName: {
      type: String,
      default: 'Unassigned'
    },
    description: {
      type: String,
      default: ''
    },
    estimatedHours: {
      type: Number,
      default: 0
    },
    progress: {
      type: Number,
      default: 0
    },
    remarks: {
      type: String,
      default: ''
    },
    comments: [{
      id: String,
      sender: String,
      role: String,
      text: String,
      time: String
    }],
    attachments: [{
      id: String,
      name: String,
      size: String,
      url: String
    }],
    approvals: [{
      level: Number,
      role: String,
      approver: String,
      status: String,
      timestamp: String,
      remarks: String
    }],
    activityLog: [{
      id: String,
      action: String,
      details: String,
      timestamp: String,
      userName: String
    }]
  }]
}, {
  timestamps: true,
  collection: 'projects'
});

projectSchema.plugin(tenantPlugin);
projectSchema.index({ companyId: 1, projectCode: 1 }, { unique: true, sparse: true });

projectSchema.pre('save', async function(next) {
  if (this.isNew && !this.projectCode) {
    try {
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      this.projectCode = await generateCompanyUniqueId(this.companyId, 'projects');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Project = mongoose.model('Project', projectSchema);

export default Project;

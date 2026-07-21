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
  branch: {
    type: String,
    default: ''
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
    assignedTo: {
      type: [String],
      default: []
    },
    assigneeId: {
      type: String,
      default: ''
    },
    assigneeName: {
      type: String,
      default: 'Unassigned'
    },
    assignedById: {
      type: String,
      default: ''
    },
    assignedByName: {
      type: String,
      default: 'System'
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
projectSchema.index({ companyId: 1, id: 1 }, { unique: true, sparse: true });
projectSchema.index({ companyId: 1, projectCode: 1 }, { unique: true, sparse: true });

const getTimelineProgress = (startDateStr, deadlineStr) => {
  if (!startDateStr || !deadlineStr) return 0;
  try {
    const start = new Date(startDateStr);
    const end = new Date(deadlineStr);
    const today = new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const totalDuration = end - start;
    if (totalDuration <= 0) return 0;
    
    const elapsed = today - start;
    const timePct = Math.round((elapsed / totalDuration) * 100);
    return Math.max(0, Math.min(100, timePct));
  } catch (err) {
    return 0;
  }
};

projectSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      if (!this.id || this.id.trim() === '') {
        let uniqueId;
        let exists = true;
        let maxAttempts = 100;
        const ProjectModel = mongoose.models.Project || mongoose.model('Project', projectSchema);
        while (exists && maxAttempts > 0) {
          maxAttempts--;
          uniqueId = await generateCompanyUniqueId(this.companyId, 'projects');
          const existing = await ProjectModel.findOne({ id: uniqueId }).lean();
          if (!existing) {
            exists = false;
          }
        }
        this.id = uniqueId;
      }
      if (!this.projectCode || this.projectCode.trim() === '') {
        this.projectCode = this.id;
      }
    } catch (err) {
      return next(err);
    }
  }

  // Recalculate tasksTotal, tasksDone, and progress
  if (this.tasks) {
    this.tasksTotal = this.tasks.length;
    this.tasksDone = this.tasks.filter(t => t.completed).length;

    const taskPct = this.tasksTotal > 0 ? (this.tasksDone / this.tasksTotal) * 100 : 0;
    const timePct = getTimelineProgress(this.startDate, this.deadline);

    const statusExplicitlySetToCompleted = this.isModified('status') && this.status === 'Completed';

    if (statusExplicitlySetToCompleted) {
      // Manager manually marked the project as Completed via the edit form.
      // Respect that decision and set progress to 100.
      this.progress = 100;
    } else {
      // Normal recalculation — progress is capped at 99 so tasks alone
      // can never auto-complete the project.
      if (this.tasksTotal > 0) {
        const raw = Math.round(0.4 * timePct + 0.6 * taskPct);
        this.progress = Math.min(99, Math.max(0, raw));
      } else {
        this.progress = 0;
      }

      // PROTECTION: if the project was previously Completed but tasks have
      // been re-opened or new tasks added, revert status back to Active.
      if (this.status === 'Completed' && this.tasksDone < this.tasksTotal) {
        this.status = 'Active';
      }
    }
  }

  next();
});

const Project = mongoose.model('Project', projectSchema);

export default Project;

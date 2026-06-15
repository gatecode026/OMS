/**
 * @file src/modules/tasks/tasks.model.js
 * @description Mongoose schema definition for Tasks module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  taskCode: {
    type: String,
    sparse: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'QA', 'Completed', 'Backlog'],
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  dueDate: {
    type: String,
    default: ''
  },
  assigneeId: {
    type: String,
    default: ''
  },
  assigneeName: {
    type: String,
    default: 'Unassigned'
  }
}, {
  timestamps: true,
  collection: 'tasks'
});

taskSchema.plugin(tenantPlugin);
taskSchema.index({ companyId: 1, id: 1 }, { unique: true, sparse: true });
taskSchema.index({ companyId: 1, taskCode: 1 }, { unique: true, sparse: true });

taskSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      const generatedCode = await generateCompanyUniqueId(this.companyId, 'tasks');
      if (!this.id || this.id.trim() === '') this.id = generatedCode;
      if (!this.taskCode || this.taskCode.trim() === '') this.taskCode = generatedCode;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;

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

const Task = mongoose.model('Task', taskSchema);

export default Task;

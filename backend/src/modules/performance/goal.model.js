/**
 * @file src/modules/performance/goal.model.js
 * @description Mongoose schema definition for Performance Goals / OKRs.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const goalSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['Individual', 'Team', 'Department', 'Project'],
    default: 'Individual'
  },
  startDate: {
    type: String,
    required: true
  },
  dueDate: {
    type: String,
    required: true
  },
  targetValue: {
    type: Number,
    required: true,
    default: 100
  },
  currentProgress: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'On Hold', 'Cancelled'],
    default: 'In Progress'
  },
  assignee: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'performance_goals'
});

goalSchema.plugin(tenantPlugin);

const Goal = mongoose.model('Goal', goalSchema);

export default Goal;

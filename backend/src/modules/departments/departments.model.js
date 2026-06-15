/**
 * @file src/modules/departments/departments.model.js
 * @description Mongoose schema definition for Departments module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const departmentSchema = new mongoose.Schema({
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
  departmentCode: {
    type: String,
    required: true,
    trim: true
  },
  head: {
    type: String,
    required: true,
    trim: true
  },
  headId: {
    type: String,
    required: true
  },
  employeeCount: {
    type: Number,
    default: 0
  },
  activeTeams: {
    type: Number,
    default: 0
  },
  branch: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
  },
  projects: {
    type: Number,
    default: 0
  },
  activeProjects: {
    type: Number,
    default: 0
  },
  completedProjects: {
    type: Number,
    default: 0
  },
  pendingProjects: {
    type: Number,
    default: 0
  },
  delayedProjects: {
    type: Number,
    default: 0
  },
  avgPerformance: {
    type: Number,
    default: 80
  },
  attendanceRate: {
    type: Number,
    default: 90
  },
  wfhFilings: {
    type: Number,
    default: 0
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  tasksInProgress: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  createdDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  status: {
    type: String,
    default: 'Active'
  },
  color: {
    type: String,
    default: '#3b82f6'
  }
}, {
  timestamps: true,
  collection: 'departments'
});

departmentSchema.plugin(tenantPlugin);
departmentSchema.index({ companyId: 1, departmentCode: 1 }, { unique: true });

// Pre-validate departmentCode generation
departmentSchema.pre('validate', async function(next) {
  if (this.isNew && !this.departmentCode) {
    try {
      const companyId = this.companyId || 'COMP-DEFAULT';
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      this.departmentCode = await generateCompanyUniqueId(companyId, 'departments');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Department = mongoose.model('Department', departmentSchema);

export default Department;

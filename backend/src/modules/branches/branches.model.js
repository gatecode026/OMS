/**
 * @file src/modules/branches/branches.model.js
 * @description Mongoose schema definition for Branches module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const branchSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  branchCode: {
    type: String,
    sparse: true,
    trim: true,
    index: true
  },
  manager: {
    type: String,
    required: true
  },
  managerId: {
    type: String,
    required: true
  },
  managerPhone: {
    type: String,
    default: ''
  },
  managerEmail: {
    type: String,
    default: ''
  },
  employeeCount: {
    type: Number,
    default: 0
  },
  departments: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    default: 'Active'
  },
  statusType: {
    type: String,
    default: 'active'
  },
  timezone: {
    type: String,
    default: 'IST (UTC+5:30)'
  },
  established: {
    type: String,
    required: true
  },
  revenue: {
    type: Number,
    default: 0
  },
  growth: {
    type: String,
    default: '+0%'
  },
  growthPositive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  attendance: {
    type: Number,
    default: 95
  },
  productivity: {
    type: Number,
    default: 90
  },
  projects: {
    active: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    delayed: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  },
  departmentHeads: {
    type: Number,
    default: 0
  },
  teamLeaders: {
    type: Number,
    default: 0
  },
  projectManagers: {
    type: Number,
    default: 0
  },
  employeesOnLeave: {
    type: Number,
    default: 0
  },
  documents: {
    type: [String],
    default: []
  }
}, {
  timestamps: true,
  collection: 'branches'
});

branchSchema.plugin(tenantPlugin);
branchSchema.index({ id: 1, companyId: 1 }, { unique: true });
branchSchema.index({ code: 1, companyId: 1 }, { unique: true });
branchSchema.index({ companyId: 1, branchCode: 1 }, { unique: true, sparse: true });

// Pre-save: generate company-scoped id and branchCode if missing
branchSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      const generatedCode = await generateCompanyUniqueId(this.companyId, 'branches');
      if (!this.id || this.id.trim() === '') this.id = generatedCode;
      if (!this.branchCode || this.branchCode.trim() === '') this.branchCode = generatedCode;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Branch = mongoose.model('Branch', branchSchema);

export default Branch;

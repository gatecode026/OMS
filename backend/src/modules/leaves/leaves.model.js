/**
 * @file src/modules/leaves/leaves.model.js
 * @description Mongoose schema definition for Leaves module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const leaveSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  isPolicy: {
    type: Boolean,
    default: false
  },
  employeeId: {
    type: String,
    required: function() { return !this.isPolicy; },
    index: true
  },
  employeeName: {
    type: String,
    required: function() { return !this.isPolicy; },
    trim: true
  },
  department: {
    type: String,
    required: function() { return !this.isPolicy; }
  },
  type: {
    type: String,
    required: function() { return !this.isPolicy; }
  },
  fromDate: {
    type: String,
    required: function() { return !this.isPolicy; },
    validate: {
      validator: function(v) {
        if (this.isPolicy || !this.isNew) return true;
        const today = new Date().toISOString().split('T')[0];
        return v >= today;
      },
      message: props => `Start date (${props.value}) cannot be before today!`
    }
  },
  toDate: {
    type: String,
    required: function() { return !this.isPolicy; }
  },
  days: {
    type: Number,
    required: function() { return !this.isPolicy; }
  },
  reason: {
    type: String,
    required: function() { return !this.isPolicy; }
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    required: function() { return !this.isPolicy; }
  },
  appliedDate: {
    type: String,
    required: function() { return !this.isPolicy; }
  },
  approverNotes: {
    type: String,
    default: ''
  },
  documentType: {
    type: String
  },
  fileName: {
    type: String
  },
  fileFormat: {
    type: String
  },
  history: [{
    date: { type: String },
    status: { type: String },
    comment: { type: String }
  }],

  // Policy fields (only required if isPolicy is true)
  leaveCode: {
    type: String,
    required: function() { return this.isPolicy; },
    trim: true,
    index: true
  },
  leaveName: {
    type: String,
    required: function() { return this.isPolicy; },
    trim: true
  },
  defaultDays: {
    type: Number,
    required: function() { return this.isPolicy; }
  },
  maxCarryForward: {
    type: Number,
    required: function() { return this.isPolicy; }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  genderRestriction: {
    type: String,
    enum: ['All', 'Female', 'Male'],
    default: 'All'
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'leaves'
});

leaveSchema.plugin(tenantPlugin);
leaveSchema.index({ companyId: 1, id: 1 }, { unique: true });
leaveSchema.index({ companyId: 1, leaveCode: 1 }, { unique: true, sparse: true });

leaveSchema.pre('save', async function(next) {
  if (this.isNew && !this.isPolicy && !this.leaveCode) {
    try {
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      this.leaveCode = await generateCompanyUniqueId(this.companyId, 'leaves');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;

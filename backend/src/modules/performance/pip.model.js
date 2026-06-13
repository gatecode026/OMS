/**
 * @file src/modules/performance/pip.model.js
 * @description Mongoose schema definition for Performance Improvement Plans (PIPs).
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const pipSchema = new mongoose.Schema({
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
  issuesIdentified: {
    type: String,
    required: true
  },
  improvementTargets: {
    type: String,
    required: true
  },
  reviewPeriod: {
    type: String,
    required: true
  },
  actionPlan: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Resolved', 'Escalated', 'Terminated'],
    default: 'Active'
  },
  reviewer: {
    type: String,
    required: true
  },
  dateCreated: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'performance_pips'
});

pipSchema.plugin(tenantPlugin);

const Pip = mongoose.model('Pip', pipSchema);

export default Pip;

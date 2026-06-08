/**
 * @file src/modules/performance/pip.model.js
 * @description Mongoose schema definition for Performance Improvement Plans (PIPs).
 */

import mongoose from 'mongoose';

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

const Pip = mongoose.model('Pip', pipSchema);

export default Pip;

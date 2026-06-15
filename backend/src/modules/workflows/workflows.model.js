/**
 * @file src/modules/workflows/workflows.model.js
 * @description Mongoose schema definition for Workflows module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const workflowSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, {
  timestamps: true,
  collection: 'workflows'
});

workflowSchema.plugin(tenantPlugin);

const Workflow = mongoose.model('Workflow', workflowSchema);

export default Workflow;

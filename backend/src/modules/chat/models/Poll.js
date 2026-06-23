/**
 * @file src/modules/chat/models/Poll.js
 * @description Mongoose schema and model for Slack/Teams style chat Polling.
 *   Uses tenantPlugin to enforce multi-tenant connection scoping.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../../utils/tenantPlugin.js';

const optionSchema = new mongoose.Schema({
  optionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId()
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  votes: [{
    type: String // Store Employee ID strings (e.g. 'GATECO-EMP-001')
  }]
}, { _id: false });

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [optionSchema],
  allowMultipleVotes: {
    type: Boolean,
    default: false
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isClosed: {
    type: Boolean,
    default: false,
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Thread',
    default: null,
    index: true
  },
  totalVotes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'polls'
});

// Enforce multi-tenant scoping
pollSchema.plugin(tenantPlugin);

// Core performance indexes
pollSchema.index({ conversationId: 1, createdAt: -1 });

const Poll = mongoose.model('Poll', pollSchema);
export default Poll;

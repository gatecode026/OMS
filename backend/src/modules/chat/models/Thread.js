/**
 * @file src/modules/chat/models/Thread.js
 * @description Mongoose schema and model for Slack-style Threading.
 *   Uses tenantPlugin to enforce multi-tenant connection scoping.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../../utils/tenantPlugin.js';

const readStateSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const threadSchema = new mongoose.Schema({
  rootMessageId: {
    type: String,
    required: true,
    index: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  participants: [{
    type: String
  }],
  followers: [{
    type: String
  }],
  replyCount: {
    type: Number,
    default: 0
  },
  lastReplyAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'resolved', 'closed'],
    default: 'open'
  },
  createdBy: {
    type: String,
    required: true
  },
  readStates: [readStateSchema]
}, {
  timestamps: true,
  collection: 'threads'
});

// Enforce multi-tenant scoping
threadSchema.plugin(tenantPlugin);

// Core performance indexes
threadSchema.index({ conversationId: 1, lastReplyAt: -1 });
threadSchema.index({ followers: 1 });

const Thread = mongoose.model('Thread', threadSchema);
export default Thread;

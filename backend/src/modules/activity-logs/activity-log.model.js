/**
 * @file src/modules/activity-logs/activity-log.model.js
 * @description Mongoose model for Activity & Audit Logs.
 */

import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  timestamp: {
    type: String,
    required: true
  },
  actor: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    required: true
  },
  fieldChanged: {
    type: String,
    default: '—'
  },
  oldValue: {
    type: String,
    default: '—'
  },
  newValue: {
    type: String,
    default: '—'
  },
  ip: {
    type: String,
    default: '127.0.0.1'
  }
}, {
  timestamps: true,
  collection: 'activity_logs'
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;

/**
 * @file src/modules/announcements/announcement.model.js
 * @description Mongoose schemas for Announcements module domains.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  user: { type: String, required: true },
  role: { type: String, required: true },
  avatar: { type: String, default: '' },
  text: { type: String, required: true },
  timestamp: { type: String, required: true }
}, { _id: false });

const announcementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Company', 'HR', 'Project', 'Event', 'Emergency'],
    default: 'Company'
  },
  priority: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Normal'],
    default: 'Normal'
  },
  publishedBy: {
    type: String,
    required: true
  },
  publishedByRole: {
    type: String,
    required: true
  },
  publishDate: {
    type: String,
    required: true
  },
  expiryDate: {
    type: String,
    default: ''
  },
  audienceType: {
    type: String,
    enum: ['All', 'Department', 'Branch'],
    default: 'All'
  },
  targetAudience: {
    type: String,
    default: 'All Employees'
  },
  views: {
    type: Number,
    default: 0
  },
  acknowledgements: {
    type: Number,
    default: 0
  },
  acknowledgedUsers: {
    type: [String],
    default: []
  },
  likedBy: {
    type: [String],
    default: []
  },
  likes: {
    type: Number,
    default: 0
  },
  pinned: {
    type: Boolean,
    default: false
  },
  deliveryChannels: {
    type: [String],
    default: ['Dashboard']
  },
  attachments: {
    type: [String],
    default: []
  },
  comments: {
    type: [commentSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['Published', 'Scheduled', 'Draft', 'Expired', 'Archived'],
    default: 'Published'
  }
}, {
  timestamps: true,
  collection: 'announcements'
});

const emergencyAlertSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: 'EMERGENCY_ALERT'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'emergency_alerts'
});

const announcementTrackingLogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  announcementId: {
    type: String,
    required: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  viewTime: {
    type: String,
    default: '—'
  },
  readStatus: {
    type: String,
    enum: ['Viewed', 'Not Viewed'],
    default: 'Not Viewed'
  },
  ackStatus: {
    type: String,
    enum: ['Acknowledged', 'Pending'],
    default: 'Pending'
  },
  device: {
    type: String,
    default: '—'
  }
}, {
  timestamps: true,
  collection: 'announcement_tracking_logs'
});

const announcementAuditLogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  prevVal: {
    type: String,
    default: 'None'
  },
  newVal: {
    type: String,
    default: ''
  },
  timestamp: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'announcement_audit_logs'
});

announcementSchema.plugin(tenantPlugin);
emergencyAlertSchema.plugin(tenantPlugin);
announcementTrackingLogSchema.plugin(tenantPlugin);
announcementAuditLogSchema.plugin(tenantPlugin);

export const Announcement = mongoose.model('Announcement', announcementSchema);
export const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema);
export const AnnouncementTrackingLog = mongoose.model('AnnouncementTrackingLog', announcementTrackingLogSchema);
export const AnnouncementAuditLog = mongoose.model('AnnouncementAuditLog', announcementAuditLogSchema);

export default {
  Announcement,
  EmergencyAlert,
  AnnouncementTrackingLog,
  AnnouncementAuditLog
};

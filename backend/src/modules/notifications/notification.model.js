/**
 * @file src/modules/notifications/notification.model.js
 * @description Mongoose model for system Notifications.
 */

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    default: 'system'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    default: 'Normal'
  },
  recipientType: {
    type: String,
    default: ''
  },
  recipientRole: {
    type: String,
    default: ''
  },
  recipientId: {
    type: String,
    default: ''
  },
  targetUserId: {
    type: String,
    default: ''
  },
  targetRole: {
    type: String,
    default: ''
  },
  forUserId: {
    type: String,
    default: ''
  },
  sentBy: {
    type: String,
    default: ''
  },
  sentDate: {
    type: String,
    default: ''
  },
  deliveryStatus: {
    type: String,
    default: 'Delivered'
  },
  readStatus: {
    type: String,
    default: 'Unread'
  },
  readTime: {
    type: String,
    default: '—'
  },
  recipients: {
    type: Number,
    default: 0
  },
  delivered: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

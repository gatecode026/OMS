/**
 * @file src/modules/notifications/pushSubscriptionModel.js
 * @description Mongoose model for User Web Push Subscriptions.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const pushSubscriptionSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  subscription: {
    endpoint: {
      type: String,
      required: true
    },
    expirationTime: {
      type: Number,
      default: null
    },
    keys: {
      p256dh: {
        type: String,
        required: true
      },
      auth: {
        type: String,
        required: true
      }
    }
  },
  userAgent: {
    type: String,
    default: ''
  },
  deviceType: {
    type: String,
    default: 'unknown'
  }
}, {
  timestamps: true,
  collection: 'push_subscriptions'
});

pushSubscriptionSchema.plugin(tenantPlugin);

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

export default PushSubscription;

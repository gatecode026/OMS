import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const webhookSubscriptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, index: true },
  targetUrl: { type: String, required: true },
  secret: { type: String, required: true },
  events: [{
    type: String,
    enum: [
      'call:started',
      'call:ended',
      'meeting:started',
      'meeting:ended',
      'recording:ready',
      'transcript:ready',
      'summary:ready'
    ]
  }],
  isActive: { type: Boolean, default: true },
  failureCount: { type: Number, default: 0 },
  lastTriggeredAt: { type: Date, default: null }
}, {
  timestamps: true,
  collection: 'webhook_subscriptions'
});

webhookSubscriptionSchema.plugin(tenantPlugin);
const WebhookSubscription = mongoose.model('WebhookSubscription', webhookSubscriptionSchema);
export default WebhookSubscription;

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const menuOptionSchema = new mongoose.Schema({
  dtmfDigit: { type: String, required: true },
  action: {
    type: String,
    enum: ['transfer_queue', 'voicemail', 'ai_bot', 'external_transfer'],
    required: true
  },
  target: { type: String, required: true }
}, { _id: false });

const ivrTreeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, index: true },
  treeName: { type: String, required: true },
  greetingMessage: { type: String, required: true },
  menuOptions: [menuOptionSchema],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'ivr_trees'
});

const telephonyQueueSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, index: true },
  queueName: { type: String, required: true },
  routingStrategy: {
    type: String,
    enum: ['round_robin', 'least_busy', 'skill_based', 'longest_idle'],
    default: 'least_busy'
  },
  agents: [{ type: String }],
  maxWaitTimeSeconds: { type: Number, default: 300 },
  overflowAction: { type: String, default: 'voicemail' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'telephony_queues'
});

ivrTreeSchema.plugin(tenantPlugin);
telephonyQueueSchema.plugin(tenantPlugin);

export const IvrTree = mongoose.model('IvrTree', ivrTreeSchema);
export const TelephonyQueue = mongoose.model('TelephonyQueue', telephonyQueueSchema);

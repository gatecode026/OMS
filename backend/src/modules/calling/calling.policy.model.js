import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const callingPolicySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, unique: true, index: true },
  licenseTier: {
    type: String,
    enum: ['free', 'standard', 'professional', 'enterprise'],
    default: 'enterprise'
  },
  featureFlags: {
    audioCalls: { type: Boolean, default: true },
    videoCalls: { type: Boolean, default: true },
    groupCalls: { type: Boolean, default: true },
    screenSharing: { type: Boolean, default: true },
    whiteboard: { type: Boolean, default: true },
    recording: { type: Boolean, default: true },
    liveCaptions: { type: Boolean, default: true },
    aiSummary: { type: Boolean, default: true }
  },
  limits: {
    maxMeetingDurationMinutes: { type: Number, default: 240 },
    maxParticipants: { type: Number, default: 250 },
    maxScreenShares: { type: Number, default: 5 }
  },
  security: {
    requireWaitingRoom: { type: Boolean, default: false },
    forceEncryptedMedia: { type: Boolean, default: true },
    allowGuestUsers: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  collection: 'calling_policies'
});

callingPolicySchema.plugin(tenantPlugin);
const CallingPolicy = mongoose.model('CallingPolicy', callingPolicySchema);
export default CallingPolicy;

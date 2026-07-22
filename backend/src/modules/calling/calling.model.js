import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: null },
  socketId: { type: String, default: null },
  role: { type: String, enum: ['host', 'participant'], default: 'participant' },
  status: { type: String, enum: ['ringing', 'joined', 'left', 'declined'], default: 'ringing' },
  joinedAt: { type: Date, default: null },
  leftAt: { type: Date, default: null },
  isMuted: { type: Boolean, default: false },
  isVideoOff: { type: Boolean, default: false }
}, { _id: false });

const callSessionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },

  callerId: { type: String, required: true, index: true },
  callerName: { type: String, required: true },
  callerAvatar: { type: String, default: null },

  calleeId: { type: String, required: true, index: true },
  calleeName: { type: String, required: true },
  calleeAvatar: { type: String, default: null },

  callType: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['ringing', 'active', 'rejected', 'ended', 'missed', 'cancelled', 'on_hold'],
    default: 'ringing'
  },
  participants: [participantSchema],
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // in seconds
  networkQuality: { type: String, default: 'Excellent' }
}, {
  timestamps: true,
  collection: 'call_sessions'
});

callSessionSchema.plugin(tenantPlugin);
const CallSession = mongoose.model('CallSession', callSessionSchema);
export default CallSession;

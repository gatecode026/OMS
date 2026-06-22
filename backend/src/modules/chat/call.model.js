import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const callSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, index: true },
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
    enum: ['ringing', 'active', 'rejected', 'ended', 'missed'],
    default: 'ringing'
  },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 } // in seconds
}, {
  timestamps: true,
  collection: 'calls'
});

callSchema.plugin(tenantPlugin);
const Call = mongoose.model('Call', callSchema);
export default Call;

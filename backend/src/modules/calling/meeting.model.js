import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const meetingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },

  hostId: { type: String, required: true, index: true },
  hostName: { type: String, required: true },

  meetingCode: { type: String, required: true, unique: true },
  meetingType: {
    type: String,
    enum: ['instant', 'scheduled', 'recurring'],
    default: 'instant'
  },

  scheduledTime: { type: Date, default: Date.now },
  durationMinutes: { type: Number, default: 60 },

  isLocked: { type: Boolean, default: false },
  waitingRoomEnabled: { type: Boolean, default: true },
  
  participantsCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true,
  collection: 'group_meetings'
});

meetingSchema.plugin(tenantPlugin);
const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const participantSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: null },
  role: { type: String, default: 'employee' },
  joinedAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },
  // Group admin permissions
  canAddMembers: { type: Boolean, default: false },
  canRemoveMembers: { type: Boolean, default: false },
  lastReadAt: { type: Date, default: null },
  lastReadMessageId: { type: String, default: null }
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, index: true },
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct',
    index: true
  },
  // Group only fields
  name: { type: String, default: null },
  description: { type: String, default: null },
  avatar: { type: String, default: null },
  avatarImageKitFileId: { type: String, default: null },
  createdBy: { type: String, default: null },
  branch: { type: String, default: null },

  participants: [participantSchema],

  // Last message preview (WhatsApp style)
  lastMessage: {
    messageId: { type: String, default: null },
    content: { type: String, default: null },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'system'],
      default: 'text'
    },
    senderId: { type: String, default: null },
    senderName: { type: String, default: null },
    sentAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false }
  },

  lastActivityAt: { type: Date, default: Date.now, index: true },
  isActive: { type: Boolean, default: true },

  // Group settings
  settings: {
    onlyAdminsCanMessage: { type: Boolean, default: false },
    onlyAdminsCanEditInfo: { type: Boolean, default: true }
  },

  // Muted participants list
  mutedBy: [{
    employeeId: String,
    mutedUntil: Date
  }],

  // Pinned conversations per user
  pinnedBy: [{
    employeeId: { type: String },
    pinnedAt: { type: Date, default: Date.now }
  }],

  // Soft delete and management statuses
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: [{
    userId: { type: String },
    deletedAt: { type: Date, default: Date.now },
    clearHistory: { type: Boolean, default: false }
  }],
  hiddenBy: [{
    userId: { type: String },
    hiddenAt: { type: Date, default: Date.now }
  }],
  archivedBy: [{
    userId: { type: String },
    archivedAt: { type: Date, default: Date.now }
  }]

}, {
  timestamps: true,
  collection: 'conversations'
});

// Indexes for performance
conversationSchema.index({ companyId: 1, lastActivityAt: -1 });
conversationSchema.index({
  companyId: 1,
  'participants.employeeId': 1,
  type: 1
});

conversationSchema.plugin(tenantPlugin);
const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;

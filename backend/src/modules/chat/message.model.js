import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const readReceiptSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  name: { type: String },
  readAt: { type: Date, default: Date.now }
}, { _id: false });

const deliveryReceiptSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  deliveredAt: { type: Date, default: Date.now }
}, { _id: false });

const reactionSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  name: { type: String },
  emoji: { type: String, required: true },
  reactedAt: { type: Date, default: Date.now }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, index: true },
  conversationId: { type: String, required: true, index: true },

  // Sender info
  senderId: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: null },
  senderRole: { type: String, default: 'employee' },

  // Message content
  content: { type: String, default: '' },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'system', 'emoji'],
    default: 'text',
    index: true
  },

  // Media/File details
  media: {
    url: { type: String, default: null },
    fileName: { type: String, default: null },
    fileSize: { type: Number, default: null },
    mimeType: { type: String, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null }
  },

  // Reply feature (WhatsApp style)
  replyTo: {
    messageId: { type: String, default: null },
    content: { type: String, default: null },
    senderId: { type: String, default: null },
    senderName: { type: String, default: null },
    type: { type: String, default: 'text' },
    mediaUrl: { type: String, default: null }
  },

  // Delivery & Read receipts (WhatsApp double tick system)
  deliveredTo: [deliveryReceiptSchema],
  readBy: [readReceiptSchema],

  // Reactions (WhatsApp emoji reactions)
  reactions: [reactionSchema],

  // Edit history
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  editHistory: [{
    content: String,
    editedAt: Date
  }],

  // Soft delete (WhatsApp "This message was deleted")
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
  deletedFor: [{
    employeeId: String,
    deletedAt: Date
  }],

  // System messages (e.g., "John added Sarah to the group")
  systemMeta: {
    action: {
      type: String,
      enum: [
        'group_created', 'member_added', 'member_removed',
        'admin_added', 'admin_removed', 'group_renamed',
        'group_avatar_changed', 'member_left'
      ],
      default: null
    },
    targetId: { type: String, default: null },
    targetName: { type: String, default: null }
  },

  // Star/Bookmark
  starredBy: [{ type: String }],

  // Pinning (WhatsApp style)
  isPinned: { type: Boolean, default: false },
  pinnedBy: { type: String, default: null },
  pinnedAt: { type: Date, default: null }

}, {
  timestamps: true,
  collection: 'messages'
});

// Critical indexes for WhatsApp-level performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ companyId: 1, conversationId: 1, createdAt: -1 });
messageSchema.index({ companyId: 1, senderId: 1 });
messageSchema.index({ conversationId: 1, _id: -1 });
messageSchema.index({
  companyId: 1,
  conversationId: 1,
  isDeleted: 1,
  createdAt: -1
});

messageSchema.plugin(tenantPlugin);
const Message = mongoose.model('Message', messageSchema);
export default Message;

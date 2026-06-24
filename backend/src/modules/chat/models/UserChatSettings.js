import mongoose from 'mongoose';
import { tenantPlugin } from '../../../utils/tenantPlugin.js';
const userChatSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  companyId: { type: String, index: true },
  blockedUsers: [{
    userId: { type: String, required: true },
    blockedAt: { type: Date, default: Date.now },
    reason: { type: String, default: null }
  }]
}, {
  timestamps: true,
  collection: 'user_chat_settings'
});
userChatSettingsSchema.plugin(tenantPlugin);
const UserChatSettings = mongoose.model('UserChatSettings', userChatSettingsSchema);
export default UserChatSettings;

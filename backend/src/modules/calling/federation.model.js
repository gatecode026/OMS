import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const federationTrustSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  requesterCompanyId: { type: String, required: true, index: true },
  targetCompanyId: { type: String, required: true, index: true },
  targetDomain: { type: String, required: true },

  trustType: {
    type: String,
    enum: ['mutual', 'one_way'],
    default: 'mutual'
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'revoked'],
    default: 'pending'
  },

  policy: {
    allowAudio: { type: Boolean, default: true },
    allowVideo: { type: Boolean, default: true },
    allowWhiteboard: { type: Boolean, default: true },
    allowGuestAccess: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  collection: 'federation_trusts'
});

const federationInvitationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  meetingId: { type: String, required: true, index: true },
  inviterCompanyId: { type: String, required: true, index: true },
  invitedEmail: { type: String, required: true },
  invitedDomain: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  }
}, {
  timestamps: true,
  collection: 'federation_invitations'
});

federationTrustSchema.plugin(tenantPlugin);
federationInvitationSchema.plugin(tenantPlugin);

export const FederationTrust = mongoose.model('FederationTrust', federationTrustSchema);
export const FederationInvitation = mongoose.model('FederationInvitation', federationInvitationSchema);

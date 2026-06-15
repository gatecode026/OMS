/**
 * @file src/modules/security/security.model.js
 * @description Mongoose models for Security & SOC Operations (IP filters, device registries, active sessions, alerts).
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

// ─── IP Whitelist Schema ───
const ipWhitelistSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  ip: { type: String, required: true },
  startRange: { type: String, default: '' },
  endRange: { type: String, default: '' },
  location: { type: String, required: true },
  purpose: { type: String, default: 'Office Network' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

ipWhitelistSchema.plugin(tenantPlugin);
export const IpWhitelist = mongoose.model('IpWhitelist', ipWhitelistSchema);

// ─── IP Blocklist Schema ───
const ipBlocklistSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  ipAddress: { type: String, required: true },
  reason: { type: String, required: true },
  blockDate: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  blockedBy: { type: String, default: 'Auth Gate' }
}, { timestamps: true });

ipBlocklistSchema.plugin(tenantPlugin);
export const IpBlocklist = mongoose.model('IpBlocklist', ipBlocklistSchema);

// ─── User Device Registry Schema ───
const userDeviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true }, // Laptop, Mobile, Tablet, Desktop
  browser: { type: String, required: true },
  os: { type: String, required: true },
  registeredBy: { type: String, required: true },
  regDate: { type: String, required: true },
  lastLogin: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Blocked', 'Pending'], default: 'Active' }
}, { timestamps: true });

userDeviceSchema.plugin(tenantPlugin);
export const UserDevice = mongoose.model('UserDevice', userDeviceSchema);

// ─── User Active Sessions Schema ───
const userSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  role: { type: String, required: true },
  loginTime: { type: String, required: true },
  lastActivity: { type: String, required: true },
  duration: { type: String, default: '—' },
  deviceType: { type: String, required: true },
  browser: { type: String, required: true },
  os: { type: String, required: true },
  ipAddress: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Idle'], default: 'Active' }
}, { timestamps: true });

userSessionSchema.plugin(tenantPlugin);
export const UserSession = mongoose.model('UserSession', userSessionSchema);

// ─── Security Alerts Schema ───
const securityAlertSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  alertType: { type: String, required: true },
  description: { type: String, required: true },
  user: { type: String, required: true },
  ipAddress: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['New', 'Investigating', 'Resolved', 'Ignored'], default: 'New' }
}, { timestamps: true });

securityAlertSchema.plugin(tenantPlugin);
export const SecurityAlert = mongoose.model('SecurityAlert', securityAlertSchema);

export default {
  IpWhitelist,
  IpBlocklist,
  UserDevice,
  UserSession,
  SecurityAlert
};

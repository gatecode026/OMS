/**
 * @file src/modules/roles/overrides.model.js
 * @description Mongoose model for User Access Permission Overrides.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const userOverrideSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  module: {
    type: String,
    required: true
  },
  scope: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  expiry: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'user_overrides'
});

userOverrideSchema.plugin(tenantPlugin);

const UserOverride = mongoose.model('UserOverride', userOverrideSchema);

export default UserOverride;

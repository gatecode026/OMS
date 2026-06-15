/**
 * @file src/modules/roles/roles.model.js
 * @description Mongoose model for system RBAC Roles and permissions.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const roleSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  userCount: {
    type: Number,
    default: 0
  },
  accentColor: {
    type: String,
    default: '#64748b'
  },
  permissions: {
    type: Map,
    of: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true,
  collection: 'rbac_roles'
});

roleSchema.index({ companyId: 1, id: 1 }, { unique: true });
roleSchema.plugin(tenantPlugin);

const Role = mongoose.model('Role', roleSchema);

export default Role;

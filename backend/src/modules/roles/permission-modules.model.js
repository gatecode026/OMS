/**
 * @file src/modules/roles/permission-modules.model.js
 * @description Mongoose model for system permissions matrix modules/components.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const permissionModuleSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    index: true
  },
  label: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'permission_modules'
});

permissionModuleSchema.index({ companyId: 1, key: 1 }, { unique: true });
permissionModuleSchema.plugin(tenantPlugin);

const PermissionModule = mongoose.model('PermissionModule', permissionModuleSchema);

export default PermissionModule;

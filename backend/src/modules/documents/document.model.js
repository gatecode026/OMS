/**
 * @file src/modules/documents/document.model.js
 * @description Mongoose schema definition for Documents module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const documentVersionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  comment: {
    type: String,
    default: ''
  }
});

const documentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  tags: {
    type: [String],
    default: []
  },
  documentScope: {
    type: String,
    enum: ['PROJECT', 'GENERAL'],
    required: true,
    default: 'GENERAL'
  },
  projectId: {
    type: String,
    default: null
  },
  projectName: {
    type: String,
    default: null
  },
  departmentId: {
    type: String,
    default: null
  },
  departmentName: {
    type: String,
    default: null
  },
  category: {
    type: String,
    required: true
  },
  visibility: {
    type: String,
    required: true,
    default: 'Company Wide'
  },
  visibilityDetails: {
    roles: {
      type: [String],
      default: []
    },
    userIds: {
      type: [String],
      default: []
    }
  },
  type: {
    type: String,
    required: true
  },
  extension: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0'
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Archived', 'Deleted'],
    default: 'Active'
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadDate: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String,
    default: ''
  },
  lastModifiedDate: {
    type: String,
    default: ''
  },
  lastViewedAt: {
    type: Date,
    default: null
  },
  downloads: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: {
    type: Date,
    default: null
  },
  fileUrl: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: ''
  },
  versions: {
    type: [documentVersionSchema],
    default: []
  }
}, {
  timestamps: true,
  collection: 'documents'
});

documentSchema.plugin(tenantPlugin);

const Document = mongoose.model('Document', documentSchema);

export default Document;

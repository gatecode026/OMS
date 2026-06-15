/**
 * @file src/modules/documents/document.model.js
 * @description Mongoose schema definition for Documents module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

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
  type: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadDate: {
    type: String,
    required: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  fileUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'documents'
});

documentSchema.plugin(tenantPlugin);

const Document = mongoose.model('Document', documentSchema);

export default Document;

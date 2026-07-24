/**
 * @file src/modules/documents/version.service.js
 * @description Version control business logic for Documents.
 */

import logger from '../../config/logger.js';
import Document from './document.model.js';
import { uploadToImageKit } from '../../utils/imagekit.js';

/**
 * Uploads a new version of an existing document.
 * @param {object} doc - Document mongoose model instance.
 * @param {object} newVersionData - { name, fileUrl, type, size, comment, uploadedBy, majorUpdate }
 * @returns {Promise<object>} The updated Document.
 */
export const uploadNewVersion = async (doc, { name, fileUrl, type, size, comment = '', uploadedBy, majorUpdate = false }) => {
  logger.info(`VersionService::uploadNewVersion running version upgrade for document: ${doc.id}`);

  // 1. Process base64 file to storage if necessary
  let finalFileUrl = fileUrl;
  if (fileUrl && fileUrl.startsWith('data:')) {
    const fileExt = type ? type.toLowerCase() : 'bin';
    const fileName = `${name.replace(/\s+/g, '_')}_v_${Date.now()}.${fileExt}`;
    finalFileUrl = await uploadToImageKit(fileUrl, fileName);
  }

  // 2. Archive current root version as a history entry
  const oldVersionEntry = {
    id: `VER-${Date.now()}-${Math.floor(10 + Math.random() * 90)}`,
    version: doc.version || '1.0',
    fileUrl: doc.fileUrl,
    size: doc.size,
    uploadedBy: doc.uploadedBy,
    uploadedAt: doc.updatedAt || new Date(),
    comment: doc.description || 'Legacy version'
  };

  // 3. Compute next version number
  const currentVerStr = doc.version || '1.0';
  const parts = currentVerStr.split('.').map(Number);
  let nextVersion = '1.1';
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    if (majorUpdate) {
      nextVersion = `${parts[0] + 1}.0`;
    } else {
      nextVersion = `${parts[0]}.${parts[1] + 1}`;
    }
  }

  // 4. Update mongoose document
  doc.versions.push(oldVersionEntry);
  doc.version = nextVersion;
  doc.fileUrl = finalFileUrl;
  doc.size = size;
  doc.lastModifiedBy = uploadedBy;
  doc.lastModifiedDate = new Date().toISOString().split('T')[0];
  if (comment) doc.description = comment;

  return doc.save();
};

/**
 * Replaces the existing file of the document without maintaining versions.
 */
export const replaceExisting = async (doc, { name, fileUrl, type, size, uploadedBy }) => {
  logger.info(`VersionService::replaceExisting replacing content for: ${doc.id}`);
  let finalFileUrl = fileUrl;
  if (fileUrl && fileUrl.startsWith('data:')) {
    const fileExt = type ? type.toLowerCase() : 'bin';
    const fileName = `${name.replace(/\s+/g, '_')}_replace_${Date.now()}.${fileExt}`;
    finalFileUrl = await uploadToImageKit(fileUrl, fileName);
  }

  doc.fileUrl = finalFileUrl;
  doc.size = size;
  doc.lastModifiedBy = uploadedBy;
  doc.lastModifiedDate = new Date().toISOString().split('T')[0];

  return doc.save();
};

export default {
  uploadNewVersion,
  replaceExisting
};

/**
 * @file src/modules/documents/documents.repository.js
 * @description Data Access layer for Documents module using Mongoose.
 */

import Document from './document.model.js';
import logger from '../../config/logger.js';
import { uploadToImageKit } from '../../utils/imagekit.js';

export const find = async (query = {}) => {
  logger.info('DocumentsRepository::find querying documents from database...');
  return Document.find(query).sort({ createdAt: -1 });
};

export const findForBranch = async (branch, query = {}) => {
  logger.info(`DocumentsRepository::findForBranch querying docs for branch: ${branch}`);
  // Return docs that belong to this branch OR docs with no branch (company-wide)
  return Document.find({
    ...query,
    $or: [
      { branch: branch },
      { branch: { $exists: false } },
      { branch: '' },
      { branch: null }
    ]
  }).sort({ createdAt: -1 });
};

export const findOne = async (id) => {
  logger.info(`DocumentsRepository::findOne querying document with ID: ${id}`);
  return Document.findOne({ id });
};

export const save = async (data) => {
  logger.info(`DocumentsRepository::save creating document: ${data.name}`);
  if (!data.id) {
    data.id = 'DOC-' + Math.floor(100 + Math.random() * 900);
  }

  // Upload file to ImageKit if it is sent as a base64 string
  if (data.fileUrl && data.fileUrl.startsWith('data:')) {
    const fileExt = data.type ? data.type.toLowerCase() : 'bin';
    const fileName = `${data.name.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
    data.fileUrl = await uploadToImageKit(data.fileUrl, fileName);
  }

  return Document.create(data);
};

export const update = async (id, data) => {
  logger.info(`DocumentsRepository::update updating document with ID: ${id}`);

  // Upload file to ImageKit if it is updated as a base64 string
  if (data.fileUrl && data.fileUrl.startsWith('data:')) {
    const fileExt = data.type ? data.type.toLowerCase() : 'bin';
    const fileName = `${data.name.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
    data.fileUrl = await uploadToImageKit(data.fileUrl, fileName);
  }

  return Document.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.info(`DocumentsRepository::remove deleting document with ID: ${id}`);
  return Document.findOneAndDelete({ id });
};

export default {
  find,
  findForBranch,
  findOne,
  save,
  update,
  remove
};


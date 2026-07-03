/**
 * @file src/modules/documents/documents.repository.js
 * @description Data Access layer for Documents module using Mongoose, secured by the Enterprise Authorization Framework.
 */

import Document from './document.model.js';
import logger from '../../config/logger.js';
import { uploadToImageKit } from '../../utils/imagekit.js';

// Security and Query Builder Imports
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { 
  validateRepositoryAccess, 
  sanitizeQueryOperators, 
  getQueryLogging 
} from '../../security/repositoryContract.js';
import { DocumentsQueryBuilder } from './documents.queryBuilder.js';
import { getStore } from '../../utils/tenantContext.js';

/**
 * Assign virtual matching userId property to Document record for ownership validation.
 */
const injectOwnerVirtualProperty = (doc, context) => {
  if (doc && context) {
    const store = getStore();
    const userName = store?.user?.name;
    if (doc.uploadedBy === userName) {
      doc.userId = context.userId;
      doc.branch = context.branch;
    }
  }
  return doc;
};

export const find = async (query = {}) => {
  const context = resolveSecurityContext();
  const builder = new DocumentsQueryBuilder(context);

  sanitizeQueryOperators(query);

  const scopedFilters = builder.buildReadQuery(query);

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] DocumentsRepository::find:
    - Query: ${JSON.stringify(query)}
    - Scope: ${JSON.stringify(scopedFilters)}`);
  }

  return Document.find(scopedFilters).sort({ createdAt: -1 });
};

export const findForBranch = async (branch, query = {}) => {
  const context = resolveSecurityContext();
  const builder = new DocumentsQueryBuilder(context);

  sanitizeQueryOperators(query);

  const incoming = {
    ...query,
    $or: [
      { branch: branch },
      { branch: { $exists: false } },
      { branch: '' },
      { branch: null }
    ]
  };

  const scopedFilters = builder.buildReadQuery(incoming);

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] DocumentsRepository::findForBranch:
    - Branch: ${branch}
    - Scope: ${JSON.stringify(scopedFilters)}`);
  }

  return Document.find(scopedFilters).sort({ createdAt: -1 });
};

export const findOne = async (id) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id });

  const doc = await Document.findOne({ id });

  if (doc && context) {
    injectOwnerVirtualProperty(doc, context);
    await validateRepositoryAccess('read', doc, {
      ownerIdFields: ['userId'],
      moduleName: 'Documents'
    });
  }

  return doc;
};

export const save = async (data) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(data);

  if (context) {
    await validateRepositoryAccess('create', data, {
      ownerIdFields: [],
      moduleName: 'Documents'
    });
  }

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
  const context = resolveSecurityContext();
  sanitizeQueryOperators(data);

  const record = await Document.findOne({ id });
  if (!record) return null;

  if (context) {
    injectOwnerVirtualProperty(record, context);
    await validateRepositoryAccess('update', record, {
      ownerIdFields: ['userId'],
      updatePayload: data,
      moduleName: 'Documents'
    });
  }

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
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id });

  const record = await Document.findOne({ id });
  if (!record) return null;

  if (context) {
    injectOwnerVirtualProperty(record, context);
    await validateRepositoryAccess('delete', record, {
      ownerIdFields: ['userId'],
      moduleName: 'Documents'
    });
  }

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

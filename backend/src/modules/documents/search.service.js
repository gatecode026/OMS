/**
 * @file src/modules/documents/search.service.js
 * @description Document advanced search, filter, and indexing service.
 */

import logger from '../../config/logger.js';
import Document from './document.model.js';
import { checkDocumentAccess } from './permission.service.js';

/**
 * Perform permission-isolated search/filter on documents.
 * @param {object} filters - { search, scope, projectId, departmentId, category, status, visibility, type, dateFrom, dateTo, uploadedBy, version }
 * @param {object} currentUser - The logged-in user.
 * @returns {Promise<Array>} List of accessible Document documents.
 */
export const searchDocuments = async (filters = {}, currentUser) => {
  logger.info(`SearchService::searchDocuments querying with filters: ${JSON.stringify(filters)}`);

  const query = {};

  // 1. Text Search matching name, tags, or description
  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ];
  }

  // 2. Exact matches
  if (filters.scope) {
    query.documentScope = filters.scope.toUpperCase();
  }
  if (filters.projectId) {
    query.projectId = filters.projectId;
  }
  if (filters.departmentId) {
    query.departmentId = filters.departmentId;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  // Soft-deleted / Active / Archived filter. Default to Active/Archived and exclude Deleted unless requested
  if (filters.status) {
    query.status = filters.status;
  } else {
    query.status = { $in: ['Active', 'Archived', 'Draft'] }; // Exclude Deleted (Recycle Bin) by default
  }
  if (filters.visibility) {
    query.visibility = filters.visibility;
  }
  if (filters.type) {
    query.type = filters.type.toUpperCase();
  }
  if (filters.uploadedBy) {
    query.uploadedBy = new RegExp(filters.uploadedBy, 'i');
  }
  if (filters.version) {
    query.version = filters.version;
  }

  // 3. Date Range
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) {
      query.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.createdAt.$lte = new Date(filters.dateTo);
    }
  }

  // 4. Retrieve candidate documents
  const candidates = await Document.find(query).sort({ createdAt: -1 });

  // 5. Apply permissions row-level isolation check
  const allowedDocs = [];
  for (const doc of candidates) {
    const hasAccess = await checkDocumentAccess(doc, currentUser, 'read');
    if (hasAccess) {
      allowedDocs.push(doc);
    }
  }

  return allowedDocs;
};

export default {
  searchDocuments
};

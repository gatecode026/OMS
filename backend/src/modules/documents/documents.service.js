/**
 * @file src/modules/documents/documents.service.js
 * @description Service business logic for Documents module.
 *
 * Branch isolation rules:
 *  - super_admin / company_admin  → see ALL documents
 *  - branch_admin / manager / team_leader / employee → see only documents
 *    whose `branch` matches their own branch (OR documents with no branch set,
 *    which are treated as company-wide shared documents)
 */

import repository from './documents.repository.js';
import logger from '../../config/logger.js';

// Roles that can see all documents across branches
const GLOBAL_ROLES = ['super_admin', 'company_admin'];

export const findAll = async (query, currentUser) => {
  logger.info('Executing DocumentsService::findAll query');
  const userRole = currentUser?.role;
  const userBranch = currentUser?.branch;

  // Super admin / company admin → unrestricted access
  if (!userRole || GLOBAL_ROLES.includes(userRole)) {
    return repository.find(query);
  }

  // All other roles → only documents for their branch OR company-wide (no branch)
  return repository.findForBranch(userBranch, query);
};

export const findById = async (id) => {
  logger.info('Executing DocumentsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing DocumentsService::createRecord by user: ' + currentUser?.id);
  // Stamp the uploader's branch so the document is scoped correctly
  if (currentUser?.branch && !GLOBAL_ROLES.includes(currentUser?.role)) {
    data.branch = currentUser.branch;
  }
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing DocumentsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing DocumentsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }
  // super_admin / company_admin can delete anything
  // branch-scoped admins/managers can delete docs in their branch
  // employees can only delete their own uploads
  const isGlobal = GLOBAL_ROLES.includes(currentUser?.role);
  const isSameBranch = doc.branch === currentUser?.branch;
  const isOwner = doc.uploadedBy === currentUser?.name;
  const isBranchAdmin = ['branch_admin', 'manager'].includes(currentUser?.role);

  if (!isGlobal && !isOwner && !(isBranchAdmin && isSameBranch)) {
    const error = new Error('You do not have permission to delete this document');
    error.statusCode = 403;
    throw error;
  }
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord
};

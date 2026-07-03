/**
 * @file src/modules/chat/conversation.repository.js
 * @description Secured repository wrapping Conversation model queries.
 */

import logger from '../../config/logger.js';
import Conversation from './conversation.model.js';
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { 
  validateRepositoryAccess, 
  sanitizeQueryOperators 
} from '../../security/repositoryContract.js';
import { ConversationQueryBuilder } from './conversation.queryBuilder.js';

const validateParticipantOrAdminAccess = (conv, context, operation = 'read') => {
  if (!conv || !context) return;
  if (context.isSuperAdmin || context.isCompanyAdmin) return;

  const isParticipant = conv.participants.some(p => p.employeeId === context.userId);
  const isBranchMatch = context.branch && conv.branch === context.branch;

  if (!isParticipant && !isBranchMatch) {
    const err = new Error(`Access denied: You are not a participant in conversation ${conv.id}.`);
    err.statusCode = 403;
    throw err;
  }
};

export const find = (query = {}) => {
  const context = resolveSecurityContext();
  const builder = new ConversationQueryBuilder(context);

  sanitizeQueryOperators(query);
  const scopedFilters = builder.buildReadQuery(query);
  return Conversation.find(scopedFilters);
};

export const findOne = async (query = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  const conv = await Conversation.findOne(query);
  if (conv && context) {
    validateParticipantOrAdminAccess(conv, context, 'read');
    await validateRepositoryAccess('read', conv, { moduleName: 'Chat' });
  }
  return conv;
};

export const create = async (data) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(data);

  if (context) {
    await validateRepositoryAccess('create', data, { moduleName: 'Chat' });
  }

  const conv = new Conversation(data);
  return conv.save();
};

export const findOneAndUpdate = async (query, updatePayload, options = { new: true }) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);
  sanitizeQueryOperators(updatePayload);

  const conv = await Conversation.findOne(query);
  if (conv && context) {
    validateParticipantOrAdminAccess(conv, context, 'update');
    await validateRepositoryAccess('update', conv, { 
      moduleName: 'Chat',
      updatePayload
    });
  }

  return Conversation.findOneAndUpdate(query, updatePayload, options);
};

export const findOneAndDelete = async (query) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  const conv = await Conversation.findOne(query);
  if (conv && context) {
    validateParticipantOrAdminAccess(conv, context, 'delete');
    await validateRepositoryAccess('delete', conv, { moduleName: 'Chat' });
  }

  return Conversation.findOneAndDelete(query);
};

export const updateOne = async (query, updatePayload, options = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);
  sanitizeQueryOperators(updatePayload);

  const conv = await Conversation.findOne(query);
  if (conv && context) {
    validateParticipantOrAdminAccess(conv, context, 'update');
    await validateRepositoryAccess('update', conv, { 
      moduleName: 'Chat',
      updatePayload
    });
  }

  return Conversation.updateOne(query, updatePayload, options);
};

export const updateMany = async (query, updatePayload, options = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);
  sanitizeQueryOperators(updatePayload);

  if (context) {
    await validateRepositoryAccess('update', { id: 'BULK' }, { moduleName: 'Chat' });
  }

  return Conversation.updateMany(query, updatePayload, options);
};

export const deleteOne = async (query) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  const conv = await Conversation.findOne(query);
  if (conv && context) {
    validateParticipantOrAdminAccess(conv, context, 'delete');
    await validateRepositoryAccess('delete', conv, { moduleName: 'Chat' });
  }

  return Conversation.deleteOne(query);
};

export const deleteMany = async (query) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  if (context) {
    await validateRepositoryAccess('delete', { id: 'BULK' }, { moduleName: 'Chat' });
  }

  return Conversation.deleteMany(query);
};

export const countDocuments = async (query = {}) => {
  const context = resolveSecurityContext();
  const builder = new ConversationQueryBuilder(context);

  sanitizeQueryOperators(query);
  const scopedFilters = builder.buildReadQuery(query);
  return Conversation.countDocuments(scopedFilters);
};

export default {
  find,
  findOne,
  create,
  findOneAndUpdate,
  findOneAndDelete,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
  countDocuments
};

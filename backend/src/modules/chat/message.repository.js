/**
 * @file src/modules/chat/message.repository.js
 * @description Secured repository wrapping Message model queries.
 */

import logger from '../../config/logger.js';
import Message from './message.model.js';
import Conversation from './conversation.model.js';
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { 
  validateRepositoryAccess, 
  sanitizeQueryOperators 
} from '../../security/repositoryContract.js';
import conversationRepository from './conversation.repository.js';

export const find = async (query = {}, options = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  // Enforce conversation authorization if conversationId is queried
  if (query.conversationId && context) {
    await conversationRepository.findOne({ id: query.conversationId });
  } else if (context && !context.isSuperAdmin && !context.isCompanyAdmin) {
    // If no conversationId is queried, limit to conversations the user participates in
    const myConvs = await Conversation.find({ 'participants.employeeId': context.userId }).select('id').lean();
    const convIds = myConvs.map(c => c.id);
    query.conversationId = { $in: convIds };
  }

  let dbQuery = Message.find(query);
  if (options.sort) dbQuery = dbQuery.sort(options.sort);
  if (options.skip) dbQuery = dbQuery.skip(options.skip);
  if (options.limit) dbQuery = dbQuery.limit(options.limit);
  if (options.select) dbQuery = dbQuery.select(options.select);
  if (options.lean) dbQuery = dbQuery.lean();

  return dbQuery;
};

export const findOne = async (query = {}, options = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  let dbQuery = Message.findOne(query);
  if (options.sort) dbQuery = dbQuery.sort(options.sort);
  if (options.select) dbQuery = dbQuery.select(options.select);
  if (options.lean) dbQuery = dbQuery.lean();

  const msg = await dbQuery;
  if (msg && context) {
    await conversationRepository.findOne({ id: msg.conversationId });
    await validateRepositoryAccess('read', msg, { 
      moduleName: 'Chat',
      ownerIdFields: ['senderId'] 
    });
  }
  return msg;
};

export const create = async (data) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(data);

  if (context) {
    await conversationRepository.findOne({ id: data.conversationId });
    await validateRepositoryAccess('create', data, { moduleName: 'Chat' });
  }

  const msg = new Message(data);
  return msg.save();
};

export const findOneAndUpdate = async (query, updatePayload, options = { new: true }) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);
  sanitizeQueryOperators(updatePayload);

  const msg = await Message.findOne(query);
  if (msg && context) {
    await conversationRepository.findOne({ id: msg.conversationId });

    // Room-level actions (pinning, unpinning, starring, reacting) can be performed by any room member
    const isRoomAction = updatePayload?.isPinned !== undefined || 
                         updatePayload?.isPinned === false ||
                         updatePayload?.isPinned === true ||
                         updatePayload?.$addToSet?.starredBy !== undefined || 
                         updatePayload?.$pull?.starredBy !== undefined ||
                         updatePayload?.$push?.reactions !== undefined ||
                         updatePayload?.$pull?.reactions !== undefined;

    if (!isRoomAction) {
      await validateRepositoryAccess('update', msg, { 
        moduleName: 'Chat',
        ownerIdFields: ['senderId'],
        updatePayload
      });
    }
  }

  return Message.findOneAndUpdate(query, updatePayload, options);
};

export const findOneAndDelete = async (query) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  const msg = await Message.findOne(query);
  if (msg && context) {
    await conversationRepository.findOne({ id: msg.conversationId });
    await validateRepositoryAccess('delete', msg, { 
      moduleName: 'Chat',
      ownerIdFields: ['senderId'] 
    });
  }

  return Message.findOneAndDelete(query);
};

export const updateOne = async (query, updatePayload, options = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);
  sanitizeQueryOperators(updatePayload);

  const msg = await Message.findOne(query);
  if (msg && context) {
    await conversationRepository.findOne({ id: msg.conversationId });
    await validateRepositoryAccess('update', msg, { 
      moduleName: 'Chat',
      ownerIdFields: ['senderId'],
      updatePayload
    });
  }

  return Message.updateOne(query, updatePayload, options);
};

export const updateMany = async (query, updatePayload, options = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);
  sanitizeQueryOperators(updatePayload);

  if (query.conversationId && context) {
    await conversationRepository.findOne({ id: query.conversationId });
  }

  if (context) {
    await validateRepositoryAccess('update', { id: 'BULK' }, { moduleName: 'Chat' });
  }

  return Message.updateMany(query, updatePayload, options);
};

export const deleteOne = async (query) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  const msg = await Message.findOne(query);
  if (msg && context) {
    await conversationRepository.findOne({ id: msg.conversationId });
    await validateRepositoryAccess('delete', msg, { 
      moduleName: 'Chat',
      ownerIdFields: ['senderId'] 
    });
  }

  return Message.deleteOne(query);
};

export const deleteMany = async (query) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  if (query.conversationId && context) {
    await conversationRepository.findOne({ id: query.conversationId });
  }

  if (context) {
    await validateRepositoryAccess('delete', { id: 'BULK' }, { moduleName: 'Chat' });
  }

  return Message.deleteMany(query);
};

export const aggregate = async (pipeline = []) => {
  const context = resolveSecurityContext();
  
  if (context && !context.isSuperAdmin && !context.isCompanyAdmin) {
    const myConvs = await Conversation.find({ 'participants.employeeId': context.userId }).select('id').lean();
    const convIds = myConvs.map(c => c.id);
    pipeline.unshift({ $match: { conversationId: { $in: convIds } } });
  }

  return Message.aggregate(pipeline);
};

export const countDocuments = async (query = {}) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(query);

  if (query.conversationId && context) {
    await conversationRepository.findOne({ id: query.conversationId });
  } else if (context && !context.isSuperAdmin && !context.isCompanyAdmin) {
    const myConvs = await Conversation.find({ 'participants.employeeId': context.userId }).select('id').lean();
    const convIds = myConvs.map(c => c.id);
    query.conversationId = { $in: convIds };
  }

  return Message.countDocuments(query);
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
  aggregate,
  countDocuments
};

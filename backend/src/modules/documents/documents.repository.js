/**
 * @file src/modules/documents/documents.repository.js
 * @description Data Access layer for Documents module using Mongoose.
 */

import Document from './document.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('DocumentsRepository::find querying documents from database...');
  return Document.find(query).sort({ createdAt: -1 });
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
  return Document.create(data);
};

export const update = async (id, data) => {
  logger.info(`DocumentsRepository::update updating document with ID: ${id}`);
  return Document.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.info(`DocumentsRepository::remove deleting document with ID: ${id}`);
  return Document.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};

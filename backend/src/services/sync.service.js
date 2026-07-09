/**
 * @file src/services/sync.service.js
 * @description Centralized Real-Time Event Dispatcher for project-wide state synchronization.
 */

import { getIO } from '../config/socket.js';
import logger from '../config/logger.js';

/**
 * Emit an entity sync event to connected socket clients.
 * @param {string} companyId - The tenant identifier.
 * @param {object} params - Payload specifications.
 * @param {string} params.module - The module domain (e.g. 'projects', 'leaves', 'attendance', 'employees').
 * @param {string} params.action - Mutation action type ('create', 'update', 'delete').
 * @param {object|string} params.data - The updated document object or identifier.
 * @param {string} [params.recipientId] - Optional user ID to restrict delivery to a single user.
 */
export const emitEntitySync = (companyId, { module, action, data, recipientId = null }) => {
  try {
    const io = getIO();
    const payload = { module, action, data };

    if (recipientId) {
      // Direct room targeted to the recipient
      io.to(`user:${recipientId}`).emit('entity:sync', payload);
      logger.info(`[Sync Engine] Targeted event emitted: ${module}:${action} to user:${recipientId}`);
    } else if (companyId) {
      // Broadcast to all company room members
      io.to(`company:${companyId}`).emit('entity:sync', payload);
      logger.info(`[Sync Engine] Company broadcast emitted: ${module}:${action} to company:${companyId}`);
    }
  } catch (err) {
    logger.debug(`[Sync Engine] Socket.io not initialized or failed to dispatch event: ${err.message}`);
  }
};

export default { emitEntitySync };

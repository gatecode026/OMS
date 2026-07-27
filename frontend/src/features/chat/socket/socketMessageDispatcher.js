/**
 * @file features/chat/socket/socketMessageDispatcher.js
 * @description Centralized Socket Message Dispatcher for Phase C (Message Engine).
 *   Binds single-instance listeners for message socket events, validates payloads with Zod,
 *   and replays pending offline mutations upon connection restoration.
 */

import { SERVER_EVENT } from '../../../core/socket/SocketEvents.js';
import { messageEventHandlers } from './messageEventHandler.js';
import { safeValidateMessage, MessageSchema } from '../schemas/message.schema.js';
import { replayOfflineQueue } from '../engine/offlineQueue.js';

let activeSubscriptions = [];

export function setupSocketMessageDispatcher(socket, queryClient, callbacks = {}) {
  if (!socket || !queryClient) return () => {};

  teardownSocketMessageDispatcher(socket);

  // Auto replay offline queue on connect / reconnect
  const onConnect = () => {
    replayOfflineQueue(socket);
  };

  socket.on('connect', onConnect);
  activeSubscriptions.push({ event: 'connect', listener: onConnect });

  const eventMap = [
    { event: SERVER_EVENT.NEW_MESSAGE, handlerKey: 'message_received', schema: MessageSchema },
    { event: 'new_message', handlerKey: 'message_received', schema: MessageSchema },
    { event: SERVER_EVENT.MESSAGE_EDITED, handlerKey: 'message_updated' },
    { event: 'message_edited', handlerKey: 'message_updated' },
    { event: SERVER_EVENT.MESSAGE_DELETED, handlerKey: 'message_deleted' },
    { event: 'message_deleted', handlerKey: 'message_deleted' },
    { event: SERVER_EVENT.REACTION_ADDED, handlerKey: 'message_reaction' },
    { event: SERVER_EVENT.REACTION_REMOVED, handlerKey: 'message_reaction' },
    { event: 'reaction_added', handlerKey: 'message_reaction' },
    { event: SERVER_EVENT.MESSAGES_READ, handlerKey: 'message_read' },
    { event: 'messages_read', handlerKey: 'message_read' },
    { event: SERVER_EVENT.MESSAGE_DELIVERED, handlerKey: 'message_delivered' },
    { event: 'message_delivered', handlerKey: 'message_delivered' },
    { event: 'message_failed', handlerKey: 'message_failed' },
    { event: SERVER_EVENT.USER_TYPING, handlerKey: 'typing_started' },
    { event: SERVER_EVENT.USER_STOPPED_TYPING, handlerKey: 'typing_stopped' },
  ];

  eventMap.forEach(({ event, handlerKey, schema }) => {
    const handlerFn = messageEventHandlers[handlerKey];
    if (!handlerFn) return;

    const listener = (payload) => {
      const validated = schema ? safeValidateMessage(schema, payload, event) : payload;
      handlerFn(queryClient, validated, callbacks);
    };

    socket.on(event, listener);
    activeSubscriptions.push({ event, listener });
  });

  return () => {
    teardownSocketMessageDispatcher(socket);
  };
}

export function teardownSocketMessageDispatcher(socket) {
  if (!socket) return;
  activeSubscriptions.forEach(({ event, listener }) => {
    socket.off(event, listener);
  });
  activeSubscriptions = [];
}

export default setupSocketMessageDispatcher;

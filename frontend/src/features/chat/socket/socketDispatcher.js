/**
 * @file features/chat/socket/socketDispatcher.js
 * @description Centralized Socket Dispatcher for Phase B Architecture.
 *   Subscribes one handler per socket event on the central socket instance.
 *   Guarantees no duplicate listeners and validates incoming payloads with Zod.
 *
 *   Flow:
 *   Socket -> Socket Dispatcher -> Conversation Event Handler -> Conversation Repository / Cache -> React Query Cache -> UI
 */

import { SERVER_EVENT } from '../../../core/socket/SocketEvents.js';
import { conversationEventHandlers } from './conversationEventHandler.js';
import { safeValidate, NewMessageSocketSchema, ConversationUpdatedSocketSchema, TypingSocketSchema, PresenceSocketSchema } from '../schemas/socket.schema.js';
import { trackSocketReconnects } from '../../../core/devtools/perf.js';

let activeSubscriptions = [];

/**
 * Register the socket event dispatcher for a connected socket instance.
 * @param {import('socket.io-client').Socket} socket
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {object} [stateCallbacks] Optional callbacks for non-cache events (presence, typing)
 * @returns {() => void} cleanup function
 */
export function setupSocketDispatcher(socket, queryClient, stateCallbacks = {}) {
  if (!socket || !queryClient) return () => {};

  // Clean up any existing listeners to ensure single registration
  teardownSocketDispatcher(socket);

  // Track socket reconnects in development mode
  const cleanupReconnects = trackSocketReconnects(socket);

  // Event mapping table between raw event names & internal handler keys
  const eventMap = [
    { event: SERVER_EVENT.NEW_CONVERSATION, handlerKey: 'new_conversation' },
    { event: 'new_conversation', handlerKey: 'new_conversation' },
    { event: SERVER_EVENT.GROUP_UPDATED, handlerKey: 'conversation_updated' },
    { event: 'conversation_updated', handlerKey: 'conversation_updated' },
    { event: SERVER_EVENT.CONVERSATION_REMOVED, handlerKey: 'conversation_deleted' },
    { event: 'conversation_deleted', handlerKey: 'conversation_deleted' },
    { event: 'conversation:deleted_for_me', handlerKey: 'conversation_deleted' },
    { event: SERVER_EVENT.CONVERSATION_ARCHIVED, handlerKey: 'conversation_archived' },
    { event: 'conversation_archived', handlerKey: 'conversation_archived' },
    { event: SERVER_EVENT.CONVERSATION_UNARCHIVED, handlerKey: 'conversation_unarchived' },
    { event: 'conversation_unarchived', handlerKey: 'conversation_unarchived' },
    { event: SERVER_EVENT.CONVERSATION_HIDDEN, handlerKey: 'conversation_hidden' },
    { event: 'conversation_hidden', handlerKey: 'conversation_hidden' },
    { event: SERVER_EVENT.CONVERSATION_UNHIDDEN, handlerKey: 'conversation_unhidden' },
    { event: 'conversation_unhidden', handlerKey: 'conversation_unhidden' },
    { event: SERVER_EVENT.CONVERSATION_PINNED, handlerKey: 'conversation_pinned' },
    { event: 'conversation_pinned', handlerKey: 'conversation_pinned' },
    { event: SERVER_EVENT.CONVERSATION_UNPINNED, handlerKey: 'conversation_unpinned' },
    { event: 'conversation_unpinned', handlerKey: 'conversation_unpinned' },
    { event: SERVER_EVENT.CONVERSATION_READ_UPDATE, handlerKey: 'conversation_read' },
    { event: 'conversation_read', handlerKey: 'conversation_read' },
    { event: 'messages_read', handlerKey: 'conversation_read' },
    { event: 'conversation_unread', handlerKey: 'conversation_unread' },
    { event: 'unread_updated', handlerKey: 'conversation_unread' },
    { event: SERVER_EVENT.MEMBER_ADDED, handlerKey: 'participant_added' },
    { event: 'participant_added', handlerKey: 'participant_added' },
    { event: SERVER_EVENT.MEMBER_REMOVED, handlerKey: 'participant_removed' },
    { event: SERVER_EVENT.MEMBER_LEFT, handlerKey: 'participant_removed' },
    { event: 'participant_removed', handlerKey: 'participant_removed' },
    { event: 'avatar_updated', handlerKey: 'avatar_updated' },
    { event: SERVER_EVENT.NEW_MESSAGE, handlerKey: 'last_message_updated', schema: NewMessageSocketSchema },
    { event: 'last_message_updated', handlerKey: 'last_message_updated', schema: NewMessageSocketSchema },
    { event: SERVER_EVENT.USER_TYPING, handlerKey: 'typing_started', schema: TypingSocketSchema },
    { event: 'typing_started', handlerKey: 'typing_started', schema: TypingSocketSchema },
    { event: SERVER_EVENT.USER_STOPPED_TYPING, handlerKey: 'typing_stopped', schema: TypingSocketSchema },
    { event: 'typing_stopped', handlerKey: 'typing_stopped', schema: TypingSocketSchema },
    { event: SERVER_EVENT.USER_ONLINE, handlerKey: 'presence_changed', schema: PresenceSocketSchema },
    { event: SERVER_EVENT.USER_OFFLINE, handlerKey: 'presence_changed', schema: PresenceSocketSchema },
    { event: SERVER_EVENT.USER_STATUS_CHANGED, handlerKey: 'presence_changed', schema: PresenceSocketSchema },
    { event: SERVER_EVENT.ONLINE_USERS_LIST, handlerKey: 'presence_changed' },
    { event: 'presence_changed', handlerKey: 'presence_changed', schema: PresenceSocketSchema },
  ];

  eventMap.forEach(({ event, handlerKey, schema }) => {
    const handlerFn = conversationEventHandlers[handlerKey];
    if (!handlerFn) return;

    const listener = (payload) => {
      const validatedPayload = schema ? safeValidate(schema, payload, event) : payload;
      handlerFn(queryClient, validatedPayload, stateCallbacks);
    };

    socket.on(event, listener);
    activeSubscriptions.push({ event, listener });
  });

  return () => {
    cleanupReconnects();
    teardownSocketDispatcher(socket);
  };
}

/**
 * Remove all subscriptions created by the dispatcher.
 * @param {import('socket.io-client').Socket} socket
 */
export function teardownSocketDispatcher(socket) {
  if (!socket) return;
  activeSubscriptions.forEach(({ event, listener }) => {
    socket.off(event, listener);
  });
  activeSubscriptions = [];
}

export default setupSocketDispatcher;

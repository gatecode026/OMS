/**
 * @file core/socket/SocketEvents.js
 * @description Canonical registry of every chat socket event name (Core layer).
 *   The audit (docs/chat-system-audit.html §04) found event names string-
 *   literal'd across three codebases, causing silent drift (e.g. web never
 *   handled `reaction_removed`; mobile bound phantom `call:offer`). This module
 *   is the web side's single source of truth — components, listeners, and the
 *   (Phase B) socket dispatcher must reference these constants, never raw
 *   strings. Names match backend/src/modules/chat/chat.socket.js.
 */

/** Events the client EMITS to the server. */
export const CLIENT_EMIT = Object.freeze({
  JOIN_CONVERSATION: 'join_conversation',
  SEND_MESSAGE: 'send_message',
  MARK_READ: 'mark_read',
  MESSAGE_DELIVERED: 'message:delivered',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  ADD_REACTION: 'add_reaction',
  REMOVE_REACTION: 'remove_reaction',
  PIN_MESSAGE: 'pin_message',
  UNPIN_MESSAGE: 'unpin_message',
  STAR_MESSAGE: 'star_message',
  UNSTAR_MESSAGE: 'unstar_message',
  MUTE_CONVERSATION: 'mute_conversation',
  UNMUTE_CONVERSATION: 'unmute_conversation',
  PIN_CONVERSATION: 'pin_conversation',
  UNPIN_CONVERSATION: 'unpin_conversation',
  VIEWING_CHAT: 'viewing_chat',
  USER_CHATSCREEN_STATUS: 'user_chatscreen_status',
  SET_STATUS: 'set_status',
  HEARTBEAT: 'heartbeat',
  REAUTHENTICATE: 'reauthenticate',
  GET_ONLINE_USERS: 'get_online_users',
  // Calls (correct signaling path — see useWebRTC)
  CALL_INITIATE: 'call:initiate',
  CALL_ACCEPT: 'call:accept',
  CALL_REJECT: 'call:reject',
  CALL_SIGNAL_OFFER: 'call:signal:offer',
  CALL_SIGNAL_ANSWER: 'call:signal:answer',
  CALL_SIGNAL_ICE: 'call:signal:ice',
});

/** Events the client LISTENS for from the server. */
export const SERVER_EVENT = Object.freeze({
  // Connection lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  REAUTHENTICATED: 'reauthenticated',
  TOKEN_EXPIRING: 'token_expiring',
  MISSED_EVENTS: 'missed_events',
  FORCE_LOGOUT: 'force_logout',

  // Messages
  NEW_MESSAGE: 'new_message',
  NEW_MESSAGE_NOTIFICATION: 'new_message_notification',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_DELIVERY_UPDATE: 'message:delivery_update',
  MESSAGES_READ: 'messages_read',
  CONVERSATION_READ_UPDATE: 'conversation:read_update',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_ERROR: 'message_error',
  MESSAGE_UPLOAD_ERROR: 'message_upload_error',
  MESSAGE_PINNED: 'message_pinned',
  MESSAGE_UNPINNED: 'message_unpinned',
  MESSAGE_STARRED: 'message_starred',
  MESSAGE_UNSTARRED: 'message_unstarred',

  // Reactions — NOTE: web currently only handles REACTION_ADDED (audit MED-1)
  REACTION_ADDED: 'reaction_added',
  REACTION_REMOVED: 'reaction_removed',
  REACTION_UPDATED: 'reaction:updated',

  // Conversations
  NEW_CONVERSATION: 'new_conversation',
  CONVERSATION_PINNED: 'conversation_pinned',
  CONVERSATION_UNPINNED: 'conversation_unpinned',
  CONVERSATION_REMOVED: 'conversation_removed',
  CONVERSATION_CLEARED: 'conversation:cleared',
  CONVERSATION_ARCHIVED: 'conversation:archived',
  CONVERSATION_UNARCHIVED: 'conversation:unarchived',
  CONVERSATION_HIDDEN: 'conversation:hidden',
  CONVERSATION_UNHIDDEN: 'conversation:unhidden',
  CONVERSATION_DELETED_FOR_ME: 'conversation:deleted_for_me',

  // Groups
  GROUP_UPDATED: 'group_updated',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_LEFT: 'member_left',

  // Presence / typing
  ONLINE_USERS_LIST: 'online_users_list',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_STATUS_CHANGED: 'user_status_changed',
  USER_CHATSCREEN_CHANGED: 'user_chatscreen_changed',
  USER_TYPING: 'user:typing',
  USER_STOPPED_TYPING: 'user:stopped_typing',
  USER_BLOCKED: 'user:blocked',
  USER_UNBLOCKED: 'user:unblocked',

  // Threads
  THREAD_REPLY_NEW: 'thread:reply:new',
  THREAD_MENTION: 'thread:mention',
  THREAD_UPDATED: 'thread:updated',
  THREAD_READ: 'thread:read',

  // Polls
  POLL_CREATED: 'poll:created',
  POLL_VOTED: 'poll:voted',
  POLL_CLOSED: 'poll:closed',
  POLL_REOPENED: 'poll:reopened',
  POLL_UPDATED: 'poll:updated',
  POLL_DELETED: 'poll:deleted',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_SYNC: 'notification:sync',
  NOTIFICATION_UNREAD_COUNT: 'notification:unread_count',

  // Calls
  CALL_INCOMING: 'call:incoming',
  CALL_RINGING: 'call:ringing',
  CALL_ACCEPTED: 'call:accepted',
  CALL_REJECTED: 'call:rejected',
  CALL_ENDED: 'call:ended',
  CALL_MISSED: 'call:missed',
  CALL_ERROR: 'call:error',
  CALL_SIGNAL_OFFER: 'call:signal:offer',
  CALL_SIGNAL_ANSWER: 'call:signal:answer',
  CALL_SIGNAL_ICE: 'call:signal:ice',
});

export default { CLIENT_EMIT, SERVER_EVENT };

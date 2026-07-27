/**
 * @file socketEventRegistry.ts
 * @description Centralized Socket.IO Event Registry for real-time communication across the OMS application.
 *              Standardizes all event names to eliminate inline magic strings and ensure type safety.
 */

export const SOCKET_EVENTS = {
  // Connection & Auth Lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  UNAUTHORIZED: 'unauthorized',
  ERROR: 'error',

  // Presence & User Status
  GET_ONLINE_USERS: 'get_online_users',
  ONLINE_USERS_LIST: 'online_users_list',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_STATUS_CHANGE: 'user_status_change',
  SET_CUSTOM_STATUS: 'set_custom_status',

  // Typing & Recording Indicators
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',

  // Room Management
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',

  // Messaging Lifecycle
  SEND_MESSAGE: 'send_message',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_ACK: 'message_ack',
  MARK_READ: 'mark_read',
  MESSAGES_READ: 'messages_read',
  MESSAGE_DELIVERED: 'message_delivered',
  EDIT_MESSAGE: 'edit_message',
  MESSAGE_EDITED: 'message_edited',
  DELETE_MESSAGE: 'delete_message',
  MESSAGE_DELETED: 'message_deleted',

  // Reactions, Starred & Pinned
  ADD_REACTION: 'add_reaction',
  REMOVE_REACTION: 'remove_reaction',
  REACTION_UPDATED: 'reaction_updated',
  PIN_MESSAGE: 'pin_message',
  MESSAGE_PINNED: 'message_pinned',

  // WebRTC Calling & Signaling
  CALL_OFFER: 'call_offer',
  CALL_ANSWER: 'call_answer',
  ICE_CANDIDATE: 'ice_candidate',
  CALL_ACCEPT: 'call_accept',
  CALL_REJECT: 'call_reject',
  CALL_END: 'call_end',

  // Profile & Sync Events
  PROFILE_UPDATED: 'profile_updated',
  AVATAR_UPDATED: 'avatar_updated',
  ATTENDANCE_PUNCH: 'attendance_punch',
  NOTIFICATION_NEW: 'notification_new',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
export default SOCKET_EVENTS;

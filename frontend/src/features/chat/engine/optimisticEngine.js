/**
 * @file features/chat/engine/optimisticEngine.js
 * @description Enterprise Optimistic Update Engine for Messages (Part 4).
 *   Generates temporary IDs, manages 10-second socket confirmation timeouts,
 *   handles rollback, failure queueing, retry, and duplicate prevention.
 */

import { appendOptimisticMessage, confirmMessageDelivered, markMessageFailed } from '../cache/messagesCache.js';

const pendingTimeouts = new Map();

/**
 * Generate a unique temporary ID for optimistic messages.
 */
export function generateTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create an optimistic message object.
 */
export function createOptimisticMessage({ convId, content, type = 'text', replyTo = null, media = null, currentUser, existingTempId }) {
  const tempId = existingTempId || generateTempId();
  return {
    id: tempId,
    tempId,
    conversationId: convId,
    senderId: currentUser?.id,
    senderName: currentUser?.name,
    senderAvatar: currentUser?.avatar,
    content,
    type,
    replyTo,
    media,
    createdAt: new Date().toISOString(),
    _deliveryStatus: 'sending',
  };
}

/**
 * Dispatch an optimistic message to the cache and register confirmation timeout.
 */
export function dispatchOptimisticMessage(queryClient, optimisticMsg, onTimeout) {
  const tempId = optimisticMsg.tempId || optimisticMsg.id;
  const convId = optimisticMsg.conversationId;

  // Append to normalized React Query cache
  appendOptimisticMessage(queryClient, convId, optimisticMsg);

  // Clear existing timeout if retrying
  if (pendingTimeouts.has(tempId)) {
    clearTimeout(pendingTimeouts.get(tempId));
  }

  // 10-second confirmation timeout
  const timeoutId = setTimeout(() => {
    markMessageFailed(queryClient, convId, tempId);

    // Save to localStorage failure queue for offline persistence
    if (optimisticMsg.senderId) {
      const storageKey = `chat_failed_msg_${optimisticMsg.senderId}_${tempId}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(optimisticMsg));
      } catch (e) {
        console.error('[optimistic-engine] Failed to persist failed message:', e);
      }
    }

    pendingTimeouts.delete(tempId);
    if (onTimeout) onTimeout(optimisticMsg);
  }, 10000);

  pendingTimeouts.set(tempId, timeoutId);
}

/**
 * Handle confirmation ACK when server acknowledges message delivery.
 */
export function handleMessageAck(queryClient, convId, tempId, confirmedMsg) {
  if (pendingTimeouts.has(tempId)) {
    clearTimeout(pendingTimeouts.get(tempId));
    pendingTimeouts.delete(tempId);
  }

  // Clean up failure queue from storage if present
  if (confirmedMsg?.senderId) {
    localStorage.removeItem(`chat_failed_msg_${confirmedMsg.senderId}_${tempId}`);
  }
  localStorage.removeItem(`chat_failed_msg_${tempId}`);

  confirmMessageDelivered(queryClient, convId, tempId, confirmedMsg);
}

/**
 * Retry sending a failed message.
 */
export function retryFailedMessage(queryClient, tempId, currentUser, sendFn) {
  if (!currentUser?.id || !tempId) return;
  const storageKey = `chat_failed_msg_${currentUser.id}_${tempId}`;
  const raw = localStorage.getItem(storageKey) || localStorage.getItem(`chat_failed_msg_${tempId}`);

  if (raw) {
    try {
      const msg = JSON.parse(raw);
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`chat_failed_msg_${tempId}`);
      if (sendFn) {
        sendFn(msg.conversationId, msg.content, msg.type, msg.replyTo, msg.media, tempId);
      }
    } catch (e) {
      console.error('[optimistic-engine] Error retrying message:', e);
    }
  }
}

export const optimisticEngine = {
  generateTempId,
  createOptimisticMessage,
  dispatchOptimisticMessage,
  handleMessageAck,
  retryFailedMessage,
};

export default optimisticEngine;

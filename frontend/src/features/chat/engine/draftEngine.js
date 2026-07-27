/**
 * @file features/chat/engine/draftEngine.js
 * @description Per-Conversation Draft Engine (Part 11).
 *   Persists unsaved text drafts, reply targets, mentions, and attachment metadata
 *   across page refreshes and conversation switches.
 *   Interacts with REST API database when online, with localStorage backup for offline compatibility.
 */

import { chatApiFetch, unwrap } from '../../../core/network/httpClient.js';

const STORAGE_PREFIX = 'chat_draft_v1_';

/** Get storage key for a conversation draft */
const getDraftKey = (userId, convId) => `${STORAGE_PREFIX}${userId}_${convId}`;

/**
 * Save draft for a conversation (local storage + database sync).
 */
export async function saveDraft(userId, convId, draftData, token) {
  if (!userId || !convId) return;
  const key = getDraftKey(userId, convId);

  try {
    if (!draftData || (!draftData.text?.trim() && !draftData.replyTo && !draftData.attachments?.length)) {
      localStorage.removeItem(key);
      // Optional REST API cleanup if available
      chatApiFetch(`/chat/conversations/${convId}/draft`, { token, method: 'DELETE' }).catch(() => {});
      return;
    }

    const payload = {
      ...draftData,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(payload));

    // Database sync when online
    chatApiFetch(`/chat/conversations/${convId}/draft`, {
      token,
      method: 'PUT',
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {
    console.error('[draft-engine] Error saving draft:', e);
  }
}

/**
 * Get draft for a conversation.
 */
export async function getDraft(userId, convId, token) {
  if (!userId || !convId) return null;
  const key = getDraftKey(userId, convId);

  // Read local storage first for fast UI render
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[draft-engine] Error reading local draft:', e);
  }

  // Fallback to database if available
  try {
    const env = await chatApiFetch(`/chat/conversations/${convId}/draft`, { token });
    const serverDraft = unwrap(env, (e) => e.data);
    if (serverDraft) {
      localStorage.setItem(key, JSON.stringify(serverDraft));
      return serverDraft;
    }
  } catch (e) {
    // Database draft fetch is optional fallback
  }

  return null;
}

/**
 * Clear draft for a conversation.
 */
export async function clearDraft(userId, convId, token) {
  return saveDraft(userId, convId, null, token);
}

export const draftEngine = {
  saveDraft,
  getDraft,
  clearDraft,
};

export default draftEngine;

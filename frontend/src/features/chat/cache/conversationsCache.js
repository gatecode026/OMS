/**
 * @file features/chat/cache/conversationsCache.js
 * @description Normalized cache for the conversation list (addendum §6). The
 *   cache entry is stored as `{ entities: { [id]: conv }, ids: [id, …] }` so a
 *   single conversation can be read/patched in O(1) and order is maintained
 *   separately — we never rebuild the whole collection to change one row.
 *
 *   Backwards-compatible interface: `readConversations` returns a plain array
 *   and `patchConversations` accepts the same value/updater-fn shapes React's
 *   setState did, so the ~27 existing `setConversations(...)` call sites in
 *   ChatContext keep working unchanged. New O(1) helpers (`upsertConversation`,
 *   `removeConversationById`, `patchConversationById`, `moveConversationToTop`)
 *   are used by the socket dispatcher (§7).
 */

import { chatKeys } from '../../../core/query/queryKeys.js';

const EMPTY_NORM = { entities: {}, ids: [] };

/** Build the normalized shape from a plain array (order preserved). */
export function normalize(arr = []) {
  const entities = {};
  const ids = [];
  for (const c of arr) {
    if (c && c.id != null && !entities[c.id]) {
      entities[c.id] = c;
      ids.push(c.id);
    }
  }
  return { entities, ids };
}

/** Flatten the normalized shape back to an ordered array. Tolerates a legacy array. */
export function denormalize(norm) {
  if (!norm) return [];
  if (Array.isArray(norm)) return norm;
  return norm.ids.map((id) => norm.entities[id]).filter(Boolean);
}

const key = () => chatKeys.conversations();

/**
 * Read the conversation list as an array (never null).
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @returns {Array}
 */
export function readConversations(queryClient) {
  return denormalize(queryClient.getQueryData(key()));
}

/**
 * Patch the conversations cache with an array value or array-updater fn.
 * Internally denormalizes → applies → renormalizes, so callers keep the plain
 * array mental model while storage stays normalized.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {Array | ((prev: Array) => Array)} updater
 */
export function patchConversations(queryClient, updater) {
  queryClient.setQueryData(key(), (prev) => {
    const arr = denormalize(prev ?? EMPTY_NORM);
    const next = typeof updater === 'function' ? updater(arr) : updater;
    return normalize(Array.isArray(next) ? next : arr);
  });
}

// ── O(1) entity operations (used by the socket dispatcher) ────────────────────

/** Insert or replace one conversation; new ids go to the front (most recent). */
export function upsertConversation(queryClient, conv) {
  if (!conv || conv.id == null) return;
  queryClient.setQueryData(key(), (prev) => {
    const norm = prev && !Array.isArray(prev) ? prev : normalize(denormalize(prev));
    const exists = !!norm.entities[conv.id];
    return {
      entities: { ...norm.entities, [conv.id]: exists ? { ...norm.entities[conv.id], ...conv } : conv },
      ids: exists ? norm.ids : [conv.id, ...norm.ids],
    };
  });
}

/** Shallow-merge a patch into one conversation by id (no-op if absent). */
export function patchConversationById(queryClient, id, patch) {
  if (id == null) return;
  queryClient.setQueryData(key(), (prev) => {
    const norm = prev && !Array.isArray(prev) ? prev : normalize(denormalize(prev));
    if (!norm.entities[id]) return norm;
    return {
      entities: { ...norm.entities, [id]: { ...norm.entities[id], ...patch } },
      ids: norm.ids,
    };
  });
}

/** Remove one conversation by id. */
export function removeConversationById(queryClient, id) {
  if (id == null) return;
  queryClient.setQueryData(key(), (prev) => {
    const norm = prev && !Array.isArray(prev) ? prev : normalize(denormalize(prev));
    if (!norm.entities[id]) return norm;
    const entities = { ...norm.entities };
    delete entities[id];
    return { entities, ids: norm.ids.filter((x) => x !== id) };
  });
}

/** Move a conversation to the top of the order (e.g. on a new message). */
export function moveConversationToTop(queryClient, id) {
  if (id == null) return;
  queryClient.setQueryData(key(), (prev) => {
    const norm = prev && !Array.isArray(prev) ? prev : normalize(denormalize(prev));
    if (!norm.entities[id] || norm.ids[0] === id) return norm;
    return { entities: norm.entities, ids: [id, ...norm.ids.filter((x) => x !== id)] };
  });
}

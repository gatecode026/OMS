/**
 * @file core/query/crossTabSync.js
 * @description Cross-tab (multi-tab) React Query cache sync via BroadcastChannel
 *   (addendum §9). Each browser tab has its own socket, so server-confirmed
 *   events already reach every tab; this layer additionally propagates *cache
 *   state* between tabs instantly — optimistic patches, REST-driven changes
 *   (archive / pin / mark-read), fresh fetches, conversation order & unread —
 *   so no tab needs a manual refresh.
 *
 *   Design:
 *   - Subscribe to the QueryCache; when a tracked key (default: ['chat', …])
 *     updates locally, post its data + timestamp to the channel.
 *   - On receiving, apply via setQueryData ONLY if newer (last-writer-wins by
 *     dataUpdatedAt), guarded by a flag so applying a remote update never
 *     re-broadcasts (no ping-pong / infinite loop).
 */

let started = false;

/**
 * Start syncing tracked query keys across tabs. Idempotent (safe under HMR).
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {{ channelName?: string, trackPrefix?: string }} [opts]
 * @returns {() => void} stop function
 */
export function startCrossTabSync(queryClient, { channelName = 'oms-cache-sync', trackPrefix = 'chat' } = {}) {
  if (started) return () => {};
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return () => {};
  started = true;

  const channel = new BroadcastChannel(channelName);
  let applyingRemote = false;

  const isTracked = (queryKey) => Array.isArray(queryKey) && queryKey[0] === trackPrefix;

  // ── Broadcast local cache updates ──────────────────────────────────────────
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (applyingRemote) return;
    if (event?.type !== 'updated') return;
    const actionType = event.action?.type;
    // 'success' = a fetch resolved; 'setState' = a setQueryData patch (socket/optimistic).
    if (actionType !== 'success' && actionType !== 'setState') return;
    const query = event.query;
    if (!query || !isTracked(query.queryKey)) return;
    if (query.state.data === undefined) return;
    try {
      channel.postMessage({
        queryKey: query.queryKey,
        data: query.state.data,
        dataUpdatedAt: query.state.dataUpdatedAt,
      });
    } catch {
      // data not structured-cloneable — skip this update rather than throw.
    }
  });

  // ── Apply remote cache updates ─────────────────────────────────────────────
  channel.onmessage = (msg) => {
    const payload = msg?.data;
    if (!payload || !Array.isArray(payload.queryKey) || payload.data === undefined) return;

    const existing = queryClient.getQueryState(payload.queryKey);
    // Last-writer-wins: ignore stale or equal-age updates.
    if (existing?.dataUpdatedAt && payload.dataUpdatedAt && existing.dataUpdatedAt >= payload.dataUpdatedAt) {
      return;
    }
    applyingRemote = true;
    try {
      queryClient.setQueryData(payload.queryKey, payload.data);
    } finally {
      applyingRemote = false;
    }
  };

  return () => {
    unsubscribe();
    channel.close();
    started = false;
  };
}

export default startCrossTabSync;

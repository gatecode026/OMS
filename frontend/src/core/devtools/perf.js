/**
 * @file core/devtools/perf.js
 * @description Development-only performance instrumentation.
 *   Tree-shakes to no-ops in production to prevent logging or overhead.
 */

import { useRef, useEffect } from "react";

const isDev = Boolean(import.meta.env?.DEV);

/**
 * Measures React renders for a component.
 * @param {string} componentName
 */
export function useRenderCount(componentName) {
  const count = useRef(0);
  useEffect(() => {
    count.current += 1;
    if (isDev) {
      console.debug(`[perf:render] ${componentName} commit #${count.current}`);
    }
  });
}

/**
 * Tracks render frequency for a specific conversation row.
 * @param {string} convId
 */
export function useConversationRenderTracker(convId) {
  const count = useRef(0);
  useEffect(() => {
    count.current += 1;
    if (isDev) {
      console.debug(
        `[perf:conv-render] Conversation ${convId} rendered #${count.current}`,
      );
    }
  });
}

/**
 * Track socket reconnection count and timing.
 * @param {import('socket.io-client').Socket} socket
 */
export function trackSocketReconnects(socket) {
  if (!isDev || !socket) return () => {};
  let reconnectCount = 0;

  const onReconnect = (attempt) => {
    reconnectCount += 1;
    console.debug(
      `[perf:socket] Socket reconnected (attempt #${attempt}, total reconnects: ${reconnectCount})`,
    );
  };

  socket.on("reconnect", onReconnect);
  return () => socket.off("reconnect", onReconnect);
}

/**
 * Measure QueryCache hit ratio, active queries, and execution counts.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 */
export function getQueryStats(queryClient) {
  if (!isDev || !queryClient) return null;
  const queryCache = queryClient.getQueryCache();
  const allQueries = queryCache.getAll();
  const activeQueries = allQueries.filter((q) => q.getObserversCount() > 0);
  const staleQueries = allQueries.filter((q) => q.isStale());

  // Calculate hit ratio
  let totalFetches = 0;
  let cacheHits = 0;

  allQueries.forEach((query) => {
    const state = query.state;
    totalFetches += state.dataUpdateCount;
    if (state.data !== undefined && state.isInvalidated === false) {
      cacheHits += 1;
    }
  });

  const hitRatio =
    totalFetches > 0 ? (cacheHits / totalFetches).toFixed(2) : "1.00";

  return {
    totalQueries: allQueries.length,
    activeQueries: activeQueries.length,
    staleQueries: staleQueries.length,
    queryExecutionCount: totalFetches,
    cacheHitRatio: hitRatio,
  };
}

/**
 * Track mutation lifecycle & execution counts.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 */
export function getMutationStats(queryClient) {
  if (!isDev || !queryClient) return null;
  const mutationCache = queryClient.getMutationCache();
  const allMutations = mutationCache.getAll();

  return {
    totalMutations: allMutations.length,
    pendingMutations: allMutations.filter((m) => m.state.status === "pending")
      .length,
    successMutations: allMutations.filter((m) => m.state.status === "success")
      .length,
    errorMutations: allMutations.filter((m) => m.state.status === "error")
      .length,
  };
}

/**
 * Track API endpoint latency.
 * @param {string} endpoint
 * @param {number} durationMs
 */
export function trackApiLatency(endpoint, durationMs) {
  if (isDev) {
    console.debug(`[perf:api] ${endpoint} executed in ${durationMs}ms`);
  }
}
/**
 * Measure browser memory usage if supported (Performance.memory).
 */
export function getMemoryUsage() {
  if (!isDev || typeof window === "undefined" || !window.performance?.memory)
    return null;
  const mem = window.performance.memory;
  return {
    usedJSHeapSizeMB: (mem.usedJSHeapSize / (1024 * 1024)).toFixed(2),
    totalJSHeapSizeMB: (mem.totalJSHeapSize / (1024 * 1024)).toFixed(2),
    jsHeapSizeLimitMB: (mem.jsHeapSizeLimit / (1024 * 1024)).toFixed(2),
  };
}
/**
 * Track virtualization scroll performance & visible index range.
 * @param {{ startIndex: number, endIndex: number, totalItems: number }} metrics
 */
export function trackVirtualizationPerf(metrics) {
  if (isDev) {
    console.debug(
      `[perf:virt] Rendering items ${metrics.startIndex}-${metrics.endIndex} of ${metrics.totalItems}`,
    );
  }
}

export default {
  useRenderCount,
  useConversationRenderTracker,
  trackSocketReconnects,
  getQueryStats,
  getMutationStats,
  trackApiLatency,
  getMemoryUsage,
  trackVirtualizationPerf,
};

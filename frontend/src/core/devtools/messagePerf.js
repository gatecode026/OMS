/**
 * @file core/devtools/messagePerf.js
 * @description Development-only performance instrumentation for the Message Engine.
 *   Tree-shakes to no-ops in production to prevent overhead.
 */

import { useRef, useEffect } from 'react';

const isDev = Boolean(import.meta.env?.DEV);

/** Track render count for individual message bubbles */
export function useMessageRenderTracker(messageId) {
  const count = useRef(0);
  useEffect(() => {
    count.current += 1;
    if (isDev) {
      console.debug(`[perf:msg-render] Message ${messageId} rendered #${count.current}`);
    }
  });
}

/** Track API latency */
export function trackApiLatency(endpoint, durationMs) {
  if (isDev) {
    console.debug(`[perf:msg-api] ${endpoint} executed in ${durationMs}ms`);
  }
}

/** Track optimistic latency from user click to socket ACK */
export function trackOptimisticLatency(tempId, durationMs) {
  if (isDev) {
    console.debug(`[perf:optimistic] TempId ${tempId} confirmed in ${durationMs}ms`);
  }
}

/** Track message pagination scroll restoration & timing */
export function trackPaginationTiming(convId, pageIndex, durationMs) {
  if (isDev) {
    console.debug(`[perf:pagination] Conv ${convId} page #${pageIndex} loaded in ${durationMs}ms`);
  }
}

export const messagePerf = {
  useMessageRenderTracker,
  trackApiLatency,
  trackOptimisticLatency,
  trackPaginationTiming,
};

export default messagePerf;

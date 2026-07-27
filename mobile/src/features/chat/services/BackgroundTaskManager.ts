/**
 * @file BackgroundTaskManager.ts
 * @description Periodic background task scheduler for cache cleanup, queue health,
 *              and telemetry flushing. All tasks run on configurable intervals
 *              and are cleanly cancelled on app teardown to prevent memory leaks.
 */

import PerformanceCacheManager from './PerformanceCacheManager';
import ObservabilityManager from './ObservabilityManager';

interface ScheduledTask {
  id: string;
  intervalMs: number;
  handler: () => void;
  timerId: ReturnType<typeof setInterval> | null;
}

export class BackgroundTaskManagerClass {
  private tasks: Map<string, ScheduledTask> = new Map();

  /**
   * Initialize and start all background tasks
   * @returns cleanup function to cancel all tasks
   */
  initialize(): () => void {
    // 1. Cache eviction — every 5 minutes
    this.scheduleTask('cache_cleanup', 5 * 60 * 1000, () => {
      const evicted = PerformanceCacheManager.evictExpired();
      if (evicted > 0) {
        console.log(`[BackgroundTaskManager] Cache cleanup — evicted ${evicted} expired entries`);
      }
    });

    // 2. Telemetry flush — every 10 minutes
    this.scheduleTask('telemetry_flush', 10 * 60 * 1000, () => {
      const summary = ObservabilityManager.getMetricsSummary();
      console.log('[BackgroundTaskManager] Telemetry snapshot:', {
        avgApiMs:    summary.avgApiLatencyMs,
        avgChatMs:   summary.avgConversationLoadMs,
        cacheHitRate: `${Math.round(summary.cacheHitRate * 100)}%`,
        totalMetrics: summary.recordedMetricsCount,
      });
    });

    // 3. Queue health check — every 2 minutes
    this.scheduleTask('queue_health', 2 * 60 * 1000, () => {
      const cacheSize = PerformanceCacheManager.size;
      if (cacheSize > 400) {
        console.warn(`[BackgroundTaskManager] Cache nearing capacity: ${cacheSize}/500 entries`);
      }
    });

    return () => this.cancelAllTasks();
  }

  private scheduleTask(id: string, intervalMs: number, handler: () => void): void {
    const timerId = setInterval(handler, intervalMs);
    this.tasks.set(id, { id, intervalMs, handler, timerId });
  }

  /**
   * Cancel all scheduled background tasks
   */
  cancelAllTasks(): void {
    for (const task of this.tasks.values()) {
      if (task.timerId !== null) {
        clearInterval(task.timerId);
      }
    }
    this.tasks.clear();
    console.log('[BackgroundTaskManager] All background tasks cancelled.');
  }

  /**
   * Get list of active task IDs
   */
  getActiveTasks(): string[] {
    return Array.from(this.tasks.keys());
  }
}

export const BackgroundTaskManager = new BackgroundTaskManagerClass();
export default BackgroundTaskManager;

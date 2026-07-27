/**
 * @file PerformanceManager.ts
 * @description Master Performance Facade — bootstraps and coordinates all performance
 *              sub-managers: PerformanceLogger, ObservabilityManager, MemoryManager,
 *              PerformanceCacheManager, and BackgroundTaskManager.
 *
 *              Usage:
 *                const cleanup = await PerformanceManager.initialize();
 *                // ... app lifecycle ...
 *                cleanup(); // on unmount / logout
 */

import PerformanceLogger from './PerformanceLogger';
import ObservabilityManager from './ObservabilityManager';
import MemoryManager from './MemoryManager';
import BackgroundTaskManager from './BackgroundTaskManager';
import PerformanceCacheManager from './PerformanceCacheManager';

export class PerformanceManagerClass {
  private cleanupFunctions: Array<() => void> = [];

  /**
   * Initialize all performance sub-managers in dependency order
   */
  initialize(): () => void {
    console.log('[PerformanceManager] Initializing enterprise performance layer...');

    // 1. Memory Manager — monitor AppState & memory pressure
    const memoryCleanup = MemoryManager.initialize();
    this.cleanupFunctions.push(memoryCleanup);

    // 2. Background Task Manager — start periodic cleanup & telemetry tasks
    const bgCleanup = BackgroundTaskManager.initialize();
    this.cleanupFunctions.push(bgCleanup);

    console.log('[PerformanceManager] ✅ Performance layer initialized.');
    console.log('[PerformanceManager] Active tasks:', BackgroundTaskManager.getActiveTasks());

    return () => this.shutdown();
  }

  /**
   * Record an API call duration through ObservabilityManager
   */
  recordApiCall(name: string, durationMs: number): void {
    ObservabilityManager.record(`api_call_${name}`, durationMs);
  }

  /**
   * Start a named performance trace
   */
  startTrace(name: string): void {
    PerformanceLogger.startTrace(name);
  }

  /**
   * End a named performance trace and return duration in ms
   */
  endTrace(name: string): number {
    const durationMs = PerformanceLogger.endTrace(name);
    if (durationMs >= 0) {
      ObservabilityManager.record(name, durationMs);
    }
    return durationMs;
  }

  /**
   * Get current observability metrics summary
   */
  getMetricsSummary() {
    return ObservabilityManager.getMetricsSummary();
  }

  /**
   * Get all slow traces from PerformanceLogger history
   */
  getSlowTraces() {
    return PerformanceLogger.getSlowTraces();
  }

  /**
   * Shutdown all performance sub-managers and flush telemetry
   */
  shutdown(): void {
    console.log('[PerformanceManager] Shutting down performance layer...');

    // Final telemetry snapshot
    const summary = ObservabilityManager.getMetricsSummary();
    console.log('[PerformanceManager] Final metrics summary:', summary);

    // Cancel background tasks
    for (const cleanup of this.cleanupFunctions) {
      cleanup();
    }
    this.cleanupFunctions = [];

    // Clear in-memory cache
    PerformanceCacheManager.clear();

    console.log('[PerformanceManager] ✅ Performance layer shut down.');
  }
}

export const PerformanceManager = new PerformanceManagerClass();
export default PerformanceManager;

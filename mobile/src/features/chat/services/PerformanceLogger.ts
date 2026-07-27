/**
 * @file PerformanceLogger.ts
 * @description Trace timing engine for measuring and flagging slow operations.
 *              Uses performance.now() for high-resolution timing.
 *              Automatically alerts on traces exceeding configured thresholds.
 */

// Configurable slow-trace thresholds (in ms)
const THRESHOLDS: Record<string, number> = {
  api_call:             2000,
  conversation_open:     500,
  conversation_switch:   300,
  message_send:          200,
  attachment_preview:    300,
  search_query:          300,
  upload:             30000,
  default:             1000,
};

interface ActiveTrace {
  name: string;
  startTime: number;
}

export class PerformanceLoggerClass {
  private activeTraces = new Map<string, ActiveTrace>();
  private completedTraces: { name: string; durationMs: number; slow: boolean; timestamp: number }[] = [];
  private readonly maxHistory = 200;

  /**
   * Start a named performance trace
   */
  startTrace(name: string): void {
    this.activeTraces.set(name, { name, startTime: performance.now() });
  }

  /**
   * End a named trace and log result
   * @returns duration in ms, or -1 if no matching trace was started
   */
  endTrace(name: string): number {
    const trace = this.activeTraces.get(name);
    if (!trace) return -1;

    this.activeTraces.delete(name);
    const durationMs = Math.round(performance.now() - trace.startTime);

    const threshold = this.resolveThreshold(name);
    const slow = durationMs > threshold;

    if (slow) {
      console.warn(`[PerformanceLogger] 🐢 SLOW TRACE — "${name}" took ${durationMs}ms (threshold: ${threshold}ms)`);
    } else {
      console.log(`[PerformanceLogger] ✅ "${name}" completed in ${durationMs}ms`);
    }

    this.completedTraces.push({ name, durationMs, slow, timestamp: Date.now() });
    if (this.completedTraces.length > this.maxHistory) {
      this.completedTraces.shift();
    }

    return durationMs;
  }

  /**
   * Get all slow traces from history
   */
  getSlowTraces() {
    return this.completedTraces.filter((t) => t.slow);
  }

  /**
   * Get full trace history
   */
  getTraceHistory() {
    return [...this.completedTraces];
  }

  private resolveThreshold(name: string): number {
    for (const key of Object.keys(THRESHOLDS)) {
      if (name.startsWith(key)) return THRESHOLDS[key];
    }
    return THRESHOLDS.default;
  }
}

export const PerformanceLogger = new PerformanceLoggerClass();
export default PerformanceLogger;

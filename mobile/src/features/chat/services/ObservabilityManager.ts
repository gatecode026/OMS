/**
 * @file ObservabilityManager.ts
 * @description Metrics collection and observability engine.
 *              Tracks app performance KPIs including launch time, conversation load,
 *              API latency, cache hit/miss rate, socket latency, and memory usage.
 *              Exposes getMetricsSummary() for monitoring dashboard consumption.
 */

export interface PerformanceMetric {
  name: string;
  valueMs: number;
  timestamp: number;
}

export interface MetricsSummary {
  avgAppLaunchMs: number;
  avgConversationLoadMs: number;
  avgApiLatencyMs: number;
  avgSocketLatencyMs: number;
  avgSearchLatencyMs: number;
  cacheHitRate: number;        // 0–1
  totalCacheHits: number;
  totalCacheMisses: number;
  recordedMetricsCount: number;
}

export class ObservabilityManagerClass {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000;

  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Record a named performance metric (duration in ms)
   */
  record(name: string, valueMs: number): void {
    this.metrics.push({ name, valueMs, timestamp: Date.now() });
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Notify a cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Notify a cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Compute and return a full metrics summary
   */
  getMetricsSummary(): MetricsSummary {
    const avg = (key: string): number => {
      const values = this.metrics.filter((m) => m.name.startsWith(key)).map((m) => m.valueMs);
      if (values.length === 0) return 0;
      return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    };

    const total = this.cacheHits + this.cacheMisses;

    return {
      avgAppLaunchMs:        avg('app_cold_start'),
      avgConversationLoadMs: avg('conversation_open'),
      avgApiLatencyMs:       avg('api_call'),
      avgSocketLatencyMs:    avg('socket_latency'),
      avgSearchLatencyMs:    avg('search_query'),
      cacheHitRate:          total > 0 ? this.cacheHits / total : 0,
      totalCacheHits:        this.cacheHits,
      totalCacheMisses:      this.cacheMisses,
      recordedMetricsCount:  this.metrics.length,
    };
  }

  /**
   * Get raw metric history filtered by name prefix
   */
  getMetrics(namePrefix?: string): PerformanceMetric[] {
    if (!namePrefix) return [...this.metrics];
    return this.metrics.filter((m) => m.name.startsWith(namePrefix));
  }

  /**
   * Reset all collected metrics
   */
  reset(): void {
    this.metrics = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

export const ObservabilityManager = new ObservabilityManagerClass();
export default ObservabilityManager;

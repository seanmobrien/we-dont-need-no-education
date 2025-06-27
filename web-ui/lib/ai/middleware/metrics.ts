/**
 * Enterprise-grade metrics collection for AI caching middleware
 * Provides hooks for monitoring cache performance and jail behavior
 */

export interface CacheMetrics {
  /** Total cache hits */
  cacheHits: number;
  /** Total cache misses */
  cacheMisses: number;
  /** Total successful caches */
  successfulCaches: number;
  /** Total problematic responses */
  problematicResponses: number;
  /** Total jail promotions */
  jailPromotions: number;
  /** Total cache errors */
  cacheErrors: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Average response size in characters */
  avgResponseSize: number;
  /** Total responses processed */
  totalResponses: number;
}

export interface CacheEvent {
  type: 'hit' | 'miss' | 'store' | 'jail_update' | 'jail_promotion' | 'error';
  cacheKey: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Metrics collector with thread-safe operations
 */
class MetricsCollector {
  private metrics: CacheMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    successfulCaches: 0,
    problematicResponses: 0,
    jailPromotions: 0,
    cacheErrors: 0,
    hitRate: 0,
    avgResponseSize: 0,
    totalResponses: 0,
  };

  private totalResponseSize = 0;
  private events: CacheEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events
  private metricsHooks: Array<(metrics: CacheMetrics) => void> = [];
  private eventHooks: Array<(event: CacheEvent) => void> = [];

  /**
   * Record a cache hit
   */
  recordHit(cacheKey: string, responseSize?: number): void {
    this.metrics.cacheHits++;
    this.metrics.totalResponses++;

    if (responseSize !== undefined) {
      this.totalResponseSize += responseSize;
      this.metrics.avgResponseSize =
        this.totalResponseSize / this.metrics.totalResponses;
    }

    this.updateHitRate();
    this.addEvent({
      type: 'hit',
      cacheKey,
      timestamp: Date.now(),
      metadata: { responseSize },
    });

    this.notifyMetricsHooks();
  }

  /**
   * Record a cache miss
   */
  recordMiss(cacheKey: string): void {
    this.metrics.cacheMisses++;
    this.metrics.totalResponses++;
    this.updateHitRate();

    this.addEvent({
      type: 'miss',
      cacheKey,
      timestamp: Date.now(),
    });

    this.notifyMetricsHooks();
  }

  /**
   * Record a successful cache store
   */
  recordStore(cacheKey: string, responseSize: number): void {
    this.metrics.successfulCaches++;

    this.addEvent({
      type: 'store',
      cacheKey,
      timestamp: Date.now(),
      metadata: { responseSize },
    });

    this.notifyMetricsHooks();
  }

  /**
   * Record a jail update
   */
  recordJailUpdate(cacheKey: string, count: number, threshold: number): void {
    this.metrics.problematicResponses++;

    this.addEvent({
      type: 'jail_update',
      cacheKey,
      timestamp: Date.now(),
      metadata: { count, threshold },
    });

    this.notifyMetricsHooks();
  }

  /**
   * Record a jail promotion
   */
  recordJailPromotion(cacheKey: string, responseSize: number): void {
    this.metrics.jailPromotions++;

    this.addEvent({
      type: 'jail_promotion',
      cacheKey,
      timestamp: Date.now(),
      metadata: { responseSize },
    });

    this.notifyMetricsHooks();
  }

  /**
   * Record a cache error
   */
  recordError(cacheKey: string, error: string): void {
    this.metrics.cacheErrors++;

    this.addEvent({
      type: 'error',
      cacheKey,
      timestamp: Date.now(),
      metadata: { error },
    });

    this.notifyMetricsHooks();
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  getEvents(limit?: number): CacheEvent[] {
    const events = [...this.events];
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: (metrics: CacheMetrics) => void): () => void {
    this.metricsHooks.push(callback);
    return () => {
      const index = this.metricsHooks.indexOf(callback);
      if (index > -1) {
        this.metricsHooks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to events
   */
  onEvent(callback: (event: CacheEvent) => void): () => void {
    this.eventHooks.push(callback);
    return () => {
      const index = this.eventHooks.indexOf(callback);
      if (index > -1) {
        this.eventHooks.splice(index, 1);
      }
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      successfulCaches: 0,
      problematicResponses: 0,
      jailPromotions: 0,
      cacheErrors: 0,
      hitRate: 0,
      avgResponseSize: 0,
      totalResponses: 0,
    };
    this.totalResponseSize = 0;
    this.events = [];
  }

  private updateHitRate(): void {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.hitRate = total > 0 ? this.metrics.cacheHits / total : 0;
  }

  private addEvent(event: CacheEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    this.notifyEventHooks(event);
  }

  private notifyMetricsHooks(): void {
    const metrics = this.getMetrics();
    this.metricsHooks.forEach((hook) => {
      try {
        hook(metrics);
      } catch (error) {
        console.error('Error in metrics hook:', error);
      }
    });
  }

  private notifyEventHooks(event: CacheEvent): void {
    this.eventHooks.forEach((hook) => {
      try {
        hook(event);
      } catch (error) {
        console.error('Error in event hook:', error);
      }
    });
  }
}

// Global metrics collector instance
const metricsCollector = new MetricsCollector();

export { metricsCollector };

/**
 * Helper function to set up basic console logging for metrics
 */
export function setupConsoleMetrics(): () => void {
  return metricsCollector.onMetricsUpdate((metrics) => {
    if (metrics.totalResponses % 10 === 0 && metrics.totalResponses > 0) {
      console.log(
        `📊 Cache Metrics - Hit Rate: ${(metrics.hitRate * 100).toFixed(1)}%, ` +
          `Hits: ${metrics.cacheHits}, Misses: ${metrics.cacheMisses}, ` +
          `Jail Promotions: ${metrics.jailPromotions}, Errors: ${metrics.cacheErrors}`,
      );
    }
  });
}

/**
 * Helper function to set up Prometheus-style metrics export
 */
export function getPrometheusMetrics(): string {
  const metrics = metricsCollector.getMetrics();
  return [
    `# HELP ai_cache_hits_total Total number of cache hits`,
    `# TYPE ai_cache_hits_total counter`,
    `ai_cache_hits_total ${metrics.cacheHits}`,
    ``,
    `# HELP ai_cache_misses_total Total number of cache misses`,
    `# TYPE ai_cache_misses_total counter`,
    `ai_cache_misses_total ${metrics.cacheMisses}`,
    ``,
    `# HELP ai_cache_hit_rate Current cache hit rate`,
    `# TYPE ai_cache_hit_rate gauge`,
    `ai_cache_hit_rate ${metrics.hitRate}`,
    ``,
    `# HELP ai_cache_jail_promotions_total Total number of jail promotions`,
    `# TYPE ai_cache_jail_promotions_total counter`,
    `ai_cache_jail_promotions_total ${metrics.jailPromotions}`,
    ``,
    `# HELP ai_cache_errors_total Total number of cache errors`,
    `# TYPE ai_cache_errors_total counter`,
    `ai_cache_errors_total ${metrics.cacheErrors}`,
    ``,
    `# HELP ai_cache_avg_response_size Average response size in characters`,
    `# TYPE ai_cache_avg_response_size gauge`,
    `ai_cache_avg_response_size ${metrics.avgResponseSize}`,
  ].join('\n');
}

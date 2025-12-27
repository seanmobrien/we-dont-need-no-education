import { log } from '@compliance-theater/lib-logger';
import { LoggedError } from '@/lib/react-util';
import { appMeters } from '@/lib/site-util/metrics';

// OpenTelemetry Metrics - Enterprise observability
const cacheHitsCounter = appMeters.createCounter('ai_cache_hits_total', {
  description: 'Total number of AI cache hits',
  unit: '1',
});

const cacheMissesCounter = appMeters.createCounter('ai_cache_misses_total', {
  description: 'Total number of AI cache misses',
  unit: '1',
});

const cacheStoresCounter = appMeters.createCounter('ai_cache_stores_total', {
  description: 'Total number of successful cache stores',
  unit: '1',
});

const jailPromotionsCounter = appMeters.createCounter(
  'ai_cache_jail_promotions_total',
  {
    description:
      'Total number of jail promotions (problematic responses cached)',
    unit: '1',
  },
);

const cacheErrorsCounter = appMeters.createCounter('ai_cache_errors_total', {
  description: 'Total number of cache operation errors',
  unit: '1',
});

const hitRateGauge = appMeters.createUpDownCounter('ai_cache_hit_rate', {
  description: 'Current cache hit rate (0-1)',
  unit: '1',
});

const avgResponseSizeGauge = appMeters.createUpDownCounter(
  'ai_cache_avg_response_size',
  {
    description: 'Average response size in characters',
    unit: 'By',
  },
);

const responseSizeHistogram = appMeters.createHistogram(
  'ai_cache_response_size_bytes',
  {
    description: 'Distribution of AI response sizes',
    unit: 'By',
  },
);

const cacheOperationDuration = appMeters.createHistogram(
  'ai_cache_operation_duration_ms',
  {
    description: 'Duration of cache operations in milliseconds',
    unit: 'ms',
  },
);

export interface CacheMetrics {
  cacheHits: number;
  cacheMisses: number;
  successfulCaches: number;
  problematicResponses: number;
  jailPromotions: number;
  cacheErrors: number;
  hitRate: number;
  avgResponseSize: number;
  totalResponses: number;
}

export interface CacheEvent {
  type: 'hit' | 'miss' | 'store' | 'jail_update' | 'jail_promotion' | 'error';
  cacheKey: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

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

  recordHit(cacheKey: string, responseSize?: number): void {
    const startTime = performance.now();

    this.metrics.cacheHits++;
    this.metrics.totalResponses++;

    if (responseSize !== undefined) {
      this.totalResponseSize += responseSize;
      this.metrics.avgResponseSize =
        this.totalResponseSize / this.metrics.totalResponses;

      // OpenTelemetry metrics
      responseSizeHistogram.record(responseSize, {
        operation: 'hit',
        cache_key: this.hashCacheKey(cacheKey),
      });
    }

    this.updateHitRate();

    // OpenTelemetry metrics
    cacheHitsCounter.add(1, {
      cache_key: this.hashCacheKey(cacheKey),
    });

    // Update hit rate gauge to current value
    hitRateGauge.add(this.metrics.hitRate, {
      cache_key: this.hashCacheKey(cacheKey),
    });

    // Update average response size gauge to current value
    if (responseSize !== undefined) {
      avgResponseSizeGauge.add(this.metrics.avgResponseSize, {
        cache_key: this.hashCacheKey(cacheKey),
      });
    }

    cacheOperationDuration.record(performance.now() - startTime, {
      operation: 'hit',
      cache_key: this.hashCacheKey(cacheKey),
    });

    this.addEvent({
      type: 'hit',
      cacheKey,
      timestamp: Date.now(),
      metadata: { responseSize },
    });

    this.notifyMetricsHooks();
  }

  recordMiss(cacheKey: string): void {
    const startTime = performance.now();

    this.metrics.cacheMisses++;
    this.metrics.totalResponses++;
    this.updateHitRate();

    // OpenTelemetry metrics
    cacheMissesCounter.add(1, {
      cache_key: this.hashCacheKey(cacheKey),
    });

    hitRateGauge.add(this.metrics.hitRate, {
      cache_key: this.hashCacheKey(cacheKey),
    });

    cacheOperationDuration.record(performance.now() - startTime, {
      operation: 'miss',
      cache_key: this.hashCacheKey(cacheKey),
    });

    this.addEvent({
      type: 'miss',
      cacheKey,
      timestamp: Date.now(),
    });

    this.notifyMetricsHooks();
  }

  recordStore(cacheKey: string, responseSize: number): void {
    const startTime = performance.now();

    this.metrics.successfulCaches++;

    // OpenTelemetry metrics
    cacheStoresCounter.add(1, {
      cache_key: this.hashCacheKey(cacheKey),
    });

    responseSizeHistogram.record(responseSize, {
      operation: 'store',
      cache_key: this.hashCacheKey(cacheKey),
    });

    cacheOperationDuration.record(performance.now() - startTime, {
      operation: 'store',
      cache_key: this.hashCacheKey(cacheKey),
    });

    this.addEvent({
      type: 'store',
      cacheKey,
      timestamp: Date.now(),
      metadata: { responseSize },
    });

    this.notifyMetricsHooks();
  }

  recordJailUpdate(cacheKey: string, count: number, threshold: number): void {
    const startTime = performance.now();

    this.metrics.problematicResponses++;

    // OpenTelemetry metrics - track jail updates
    cacheOperationDuration.record(performance.now() - startTime, {
      operation: 'jail_update',
      cache_key: this.hashCacheKey(cacheKey),
      count: count.toString(),
      threshold: threshold.toString(),
    });

    this.addEvent({
      type: 'jail_update',
      cacheKey,
      timestamp: Date.now(),
      metadata: { count, threshold },
    });

    this.notifyMetricsHooks();
  }

  recordJailPromotion(cacheKey: string, responseSize: number): void {
    const startTime = performance.now();

    this.metrics.jailPromotions++;

    // OpenTelemetry metrics
    jailPromotionsCounter.add(1, {
      cache_key: this.hashCacheKey(cacheKey),
    });

    responseSizeHistogram.record(responseSize, {
      operation: 'jail_promotion',
      cache_key: this.hashCacheKey(cacheKey),
    });

    cacheOperationDuration.record(performance.now() - startTime, {
      operation: 'jail_promotion',
      cache_key: this.hashCacheKey(cacheKey),
    });

    this.addEvent({
      type: 'jail_promotion',
      cacheKey,
      timestamp: Date.now(),
      metadata: { responseSize },
    });

    this.notifyMetricsHooks();
  }

  recordError(cacheKey: string, error: string): void {
    const startTime = performance.now();

    this.metrics.cacheErrors++;

    // OpenTelemetry metrics
    cacheErrorsCounter.add(1, {
      cache_key: this.hashCacheKey(cacheKey),
      error_type: this.categorizeError(error),
    });

    cacheOperationDuration.record(performance.now() - startTime, {
      operation: 'error',
      cache_key: this.hashCacheKey(cacheKey),
      error_type: this.categorizeError(error),
    });

    this.addEvent({
      type: 'error',
      cacheKey,
      timestamp: Date.now(),
      metadata: { error },
    });

    this.notifyMetricsHooks();
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getEvents(limit?: number): CacheEvent[] {
    const events = [...this.events];
    return limit ? events.slice(-limit) : events;
  }

  onMetricsUpdate(callback: (metrics: CacheMetrics) => void): () => void {
    this.metricsHooks.push(callback);
    return () => {
      const index = this.metricsHooks.indexOf(callback);
      if (index > -1) {
        this.metricsHooks.splice(index, 1);
      }
    };
  }

  onEvent(callback: (event: CacheEvent) => void): () => void {
    this.eventHooks.push(callback);
    return () => {
      const index = this.eventHooks.indexOf(callback);
      if (index > -1) {
        this.eventHooks.splice(index, 1);
      }
    };
  }

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

  private hashCacheKey(cacheKey: string): string {
    // Simple hash to avoid exposing sensitive cache keys in telemetry
    let hash = 0;
    for (let i = 0; i < cacheKey.length; i++) {
      const char = cacheKey.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();
    if (errorLower.includes('timeout') || errorLower.includes('ttl')) {
      return 'timeout';
    }
    if (errorLower.includes('connection') || errorLower.includes('network')) {
      return 'connection';
    }
    if (errorLower.includes('redis') || errorLower.includes('database')) {
      return 'redis';
    }
    if (errorLower.includes('parse') || errorLower.includes('json')) {
      return 'parse';
    }
    if (errorLower.includes('permission') || errorLower.includes('auth')) {
      return 'auth';
    }
    return 'unknown';
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
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'metricsCollector',
        });
      }
    });
  }

  private notifyEventHooks(event: CacheEvent): void {
    this.eventHooks.forEach((hook) => {
      try {
        hook(event);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'metricsCollector',
        });
      }
    });
  }
}

const metricsCollector = new MetricsCollector();

export { metricsCollector };

export function setupConsoleMetrics(): () => void {
  return metricsCollector.onMetricsUpdate((metrics) => {
    if (metrics.totalResponses % 10 === 0 && metrics.totalResponses > 0) {
      log((l) =>
        l.info(
          `📊 Cache Metrics - Hit Rate: ${(metrics.hitRate * 100).toFixed(1)}%, ` +
          `Hits: ${metrics.cacheHits}, Misses: ${metrics.cacheMisses}, ` +
          `Jail Promotions: ${metrics.jailPromotions}, Errors: ${metrics.cacheErrors}`,
        ),
      );
    }
  });
}

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

export function updateOpenTelemetryGauges(): void {
  const metrics = metricsCollector.getMetrics();

  // Update gauges with current values (reset and set)
  hitRateGauge.add(metrics.hitRate, { source: 'periodic_update' });
  avgResponseSizeGauge.add(metrics.avgResponseSize, {
    source: 'periodic_update',
  });
}

export function getOpenTelemetryMetricsSummary(): Record<string, unknown> {
  const metrics = metricsCollector.getMetrics();
  return {
    opentelemetry_metrics: {
      counters: {
        ai_cache_hits_total: metrics.cacheHits,
        ai_cache_misses_total: metrics.cacheMisses,
        ai_cache_stores_total: metrics.successfulCaches,
        ai_cache_jail_promotions_total: metrics.jailPromotions,
        ai_cache_errors_total: metrics.cacheErrors,
      },
      gauges: {
        ai_cache_hit_rate: metrics.hitRate,
        ai_cache_avg_response_size: metrics.avgResponseSize,
      },
      histograms: {
        ai_cache_response_size_bytes: 'tracked',
        ai_cache_operation_duration_ms: 'tracked',
      },
    },
    collection_info: {
      total_events: metricsCollector.getEvents().length,
      last_updated: new Date().toISOString(),
    },
  };
}

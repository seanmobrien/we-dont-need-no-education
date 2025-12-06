/**
 * @fileoverview Enterprise-grade metrics collection for AI caching middleware.
 * Provides hooks for monitoring cache performance and jail behavior.
 *
 * Features:
 * - OpenTelemetry integration for enterprise observability
 * - Prometheus-compatible metrics export
 * - Real-time event streaming and hooks
 * - Performance timing and response size tracking
 * - Error categorization and jail behavior monitoring
 */

declare module '@/lib/ai/middleware/cacheWithRedis/metrics' {
  /**
   * Interface representing the current state of cache metrics.
   */
  export interface CacheMetrics {
    /** Total number of cache hits. */
    cacheHits: number;
    /** Total number of cache misses. */
    cacheMisses: number;
    /** Total number of successful cache store operations. */
    successfulCaches: number;
    /** Total number of responses identified as problematic. */
    problematicResponses: number;
    /** Total number of times a request was promoted to the "jail" (cached failure). */
    jailPromotions: number;
    /** Total number of errors encountered during cache operations. */
    cacheErrors: number;
    /** Current cache hit rate, expressed as a number between 0 and 1. */
    hitRate: number;
    /** Average size of cached responses in characters. */
    avgResponseSize: number;
    /** Total number of responses processed by the middleware. */
    totalResponses: number;
  }

  /**
   * Interface representing a specific cache event.
   */
  export interface CacheEvent {
    /** The type of event that occurred. */
    type: 'hit' | 'miss' | 'store' | 'jail_update' | 'jail_promotion' | 'error';
    /** The cache key associated with the event. */
    cacheKey: string;
    /** The timestamp (ms) when the event occurred. */
    timestamp: number;
    /** Additional metadata associated with the event (e.g., response size, error details). */
    metadata?: Record<string, unknown>;
  }

  /**
   * Metrics collector class responsible for tracking and aggregating cache performance data.
   * Supports thread-safe operations and provides hooks for external monitoring systems.
   */
  class MetricsCollector {
    /**
     * Records a cache hit event.
     * Updates hit counters, hit rate, and response size metrics.
     *
     * @param cacheKey - The cache key that was hit.
     * @param responseSize - The size of the cached response (optional).
     */
    recordHit(cacheKey: string, responseSize?: number): void;

    /**
     * Records a cache miss event.
     * Updates miss counters and hit rate.
     *
     * @param cacheKey - The cache key that was missed.
     */
    recordMiss(cacheKey: string): void;

    /**
     * Records a successful cache store event.
     *
     * @param cacheKey - The cache key that was stored.
     * @param responseSize - The size of the stored response.
     */
    recordStore(cacheKey: string, responseSize: number): void;

    /**
     * Records an update to a jail entry (e.g., incrementing the failure count).
     *
     * @param cacheKey - The cache key associated with the problematic request.
     * @param count - The current failure count.
     * @param threshold - The threshold at which the request will be jailed.
     */
    recordJailUpdate(cacheKey: string, count: number, threshold: number): void;

    /**
     * Records a jail promotion event (request moved to jail).
     *
     * @param cacheKey - The cache key that was jailed.
     * @param responseSize - The size of the response associated with the jail promotion.
     */
    recordJailPromotion(cacheKey: string, responseSize: number): void;

    /**
     * Records a cache error event.
     *
     * @param cacheKey - The cache key associated with the error.
     * @param error - A string description of the error.
     */
    recordError(cacheKey: string, error: string): void;

    /**
     * Retrieves a snapshot of the current metrics.
     *
     * @returns {CacheMetrics} A copy of the current metrics object.
     */
    getMetrics(): CacheMetrics;

    /**
     * Retrieves a list of recent cache events.
     *
     * @param limit - Optional limit on the number of events to return (returns the most recent ones).
     * @returns {CacheEvent[]} An array of recent cache events.
     */
    getEvents(limit?: number): CacheEvent[];

    /**
     * Subscribes to metrics updates.
     * The callback will be invoked whenever metrics change significantly or periodically.
     *
     * @param callback - Function to be called with the updated metrics.
     * @returns {() => void} A function to unsubscribe from updates.
     */
    onMetricsUpdate(callback: (metrics: CacheMetrics) => void): () => void;

    /**
     * Subscribes to cache events.
     * The callback will be invoked for every new event.
     *
     * @param callback - Function to be called with the new event.
     * @returns {() => void} A function to unsubscribe from events.
     */
    onEvent(callback: (event: CacheEvent) => void): () => void;

    /**
     * Resets all metrics and events to their initial state.
     */
    reset(): void;
  }

  /**
   * Global singleton instance of the MetricsCollector.
   */
  export const metricsCollector: MetricsCollector;

  /**
   * Sets up basic console logging for metrics.
   * Logs a summary of cache performance to the console periodically.
   *
   * @returns {() => void} A function to stop the console logging.
   */
  export function setupConsoleMetrics(): () => void;

  /**
   * Generates a Prometheus-compatible metrics string.
   *
   * @returns {string} The metrics in Prometheus text format.
   */
  export function getPrometheusMetrics(): string;

  /**
   * Updates OpenTelemetry gauge metrics with current values.
   * Should be called periodically to ensure gauges reflect the current state.
   */
  export function updateOpenTelemetryGauges(): void;

  /**
   * Retrieves a summary of OpenTelemetry metrics for debugging purposes.
   *
   * @returns {Record<string, unknown>} A dictionary containing metric values and collection info.
   */
  export function getOpenTelemetryMetricsSummary(): Record<string, unknown>;
}

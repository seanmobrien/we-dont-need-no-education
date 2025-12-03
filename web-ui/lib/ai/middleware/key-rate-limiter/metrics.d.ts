/**
 * @fileoverview Metrics collection for Key Rate Limiter Middleware.
 *
 * This module provides a singleton class for collecting and recording OpenTelemetry metrics
 * related to rate limiting, including message processing counts, error rates, processing duration,
 * and queue sizes.
 */

declare module '@/lib/ai/middleware/key-rate-limiter/metrics' {
  /**
   * Singleton class for collecting rate limit metrics.
   */
  export class RateLimitMetricsCollector {
    /**
     * Gets the singleton instance of the metrics collector.
     * @returns {RateLimitMetricsCollector} The singleton instance.
     */
    static getInstance(): RateLimitMetricsCollector;

    /**
     * Records a processed message metric.
     * @param modelClassification - The classification of the model (e.g., 'hifi', 'lofi').
     * @param generation - The generation queue identifier (1 or 2).
     */
    recordMessageProcessed(
      modelClassification: string,
      generation: 1 | 2,
    ): void;

    /**
     * Records an error metric.
     * @param errorType - The type of error encountered.
     * @param modelClassification - The classification of the model (optional).
     */
    recordError(errorType: string, modelClassification?: string): void;

    /**
     * Records the duration of message processing.
     * @param durationMs - The duration in milliseconds.
     * @param modelClassification - The classification of the model.
     */
    recordProcessingDuration(
      durationMs: number,
      modelClassification: string,
    ): void;

    /**
     * Updates the gauge for the current queue size.
     * @param size - The current size of the queue.
     * @param modelClassification - The classification of the model.
     * @param generation - The generation queue identifier (1 or 2).
     */
    updateQueueSize(
      size: number,
      modelClassification: string,
      generation: 1 | 2,
    ): void;

    /**
     * Retrieves a summary of the collected metrics for debugging purposes.
     * @returns {Record<string, unknown>} A dictionary containing metric summaries.
     */
    getMetricsSummary(): Record<string, unknown>;
  }

  /**
   * The global singleton instance of the RateLimitMetricsCollector.
   */
  export const rateLimitMetrics: RateLimitMetricsCollector;
}

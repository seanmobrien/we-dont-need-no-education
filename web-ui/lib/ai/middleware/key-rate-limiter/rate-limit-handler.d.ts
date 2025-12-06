/**
 * @fileoverview Rate limit error handling and model disabling logic.
 *
 * This module provides functions to handle rate limit errors, disable models temporarily,
 * and manage fallback or retry strategies.
 */

import type { ModelClassification, ModelFailoverConfig } from './types';

declare module '@/lib/ai/middleware/key-rate-limiter/rate-limit-handler' {
  /**
   * Disables a model based on rate limit headers.
   *
   * @param modelKey - The model key to disable
   * @param retryAfter - The retry after duration in seconds
   */
  export function disableModelFromRateLimit(
    modelKey: string,
    retryAfter: number,
  ): void;

  /**
   * Handles rate limit errors by disabling the current model, attempting fallback,
   * and enqueueing the request for retry if needed.
   *
   * @param error - The error that occurred
   * @param currentModelKey - The current model key that hit the rate limit
   * @param modelClassification - The model classification
   * @param failoverConfig - The failover configuration
   * @param params - The request parameters
   * @param errorContext - Additional context for error types ('generate', 'stream', 'stream_setup')
   * @returns The request ID if enqueued, otherwise rethrows the original error
   */
  export function handleRateLimitError(
    error: unknown,
    currentModelKey: string,
    modelClassification: ModelClassification,
    failoverConfig: ModelFailoverConfig | undefined,
    params: Record<string, unknown>,
    errorContext?: 'generate' | 'stream' | 'stream_setup',
  ): Promise<never>;
}

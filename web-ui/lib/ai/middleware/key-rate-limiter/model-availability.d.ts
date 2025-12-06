/**
 * @fileoverview Model availability and fallback logic.
 *
 * This module provides functions to check if a model is available, handle fallback
 * to alternative providers, and enqueue requests for retry if no models are available.
 */

import type { ModelClassification, ModelFailoverConfig } from './types';

declare module '@/lib/ai/middleware/key-rate-limiter/model-availability' {
  /**
   * Retry delay for model requests in milliseconds.
   */
  export const CHAT_RETRY_DELAY_MS: number;

  /**
   * Check if model is available and get fallback if needed.
   *
   * @param provider - The model provider ('azure' or 'google').
   * @param classification - The model classification.
   * @returns The available model key or null if not available.
   */
  export function getAvailableModel(
    provider: 'azure' | 'google',
    classification: ModelClassification,
  ): string | null;

  /**
   * Checks model availability and handles fallback logic.
   * If no models are available, enqueues the request for retry.
   *
   * @param currentModelKey - The current model key being checked
   * @param modelClassification - The model classification
   * @param failoverConfig - The failover configuration
   * @param params - The request parameters
   * @returns The available model key or throws an error if none available
   */
  export function checkModelAvailabilityAndFallback(
    currentModelKey: string,
    modelClassification: ModelClassification,
    failoverConfig: ModelFailoverConfig | undefined,
    params: Record<string, unknown> & {
      prompt?: unknown[];
      chatId: string;
      turnId: string;
    },
  ): Promise<string | void>;

  /**
   * Enqueues a request for retry processing when models are unavailable or rate limited.
   *
   * @param modelClassification - The model classification
   * @param params - The request parameters
   * @param errorType - The type of error causing the enqueue
   * @returns The generated request ID
   */
  export function enqueueRequestForRetry(
    modelClassification: ModelClassification,
    params: Record<string, unknown> & {
      prompt?: unknown[];
      chatId: string;
      turnId: string;
    },
    errorType: string,
  ): Promise<string>;
}

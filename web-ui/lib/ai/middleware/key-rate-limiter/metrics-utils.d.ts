/**
 * @fileoverview Utility functions for recording metrics and managing provider keys.
 */

import type { ModelClassification } from './types';

declare module '@/lib/ai/middleware/key-rate-limiter/metrics-utils' {
  /**
   * Records performance metrics for request processing.
   *
   * @param startTime - The start time of the request in milliseconds
   * @param modelClassification - The model classification
   * @param operationType - The type of operation ('generate' or 'stream')
   */
  export function recordRequestMetrics(
    startTime: number,
    modelClassification: ModelClassification,
    operationType: 'generate' | 'stream',
  ): void;

  /**
   * Gets the current provider from a model key or defaults to 'azure'.
   *
   * @param modelKey - Optional model key to extract provider from
   * @returns The provider ('azure' or 'google')
   */
  export function getCurrentProvider(modelKey?: string): 'azure' | 'google';

  /**
   * Constructs a model key from provider and classification.
   *
   * @param provider - The model provider
   * @param classification - The model classification
   * @returns The constructed model key
   */
  export function constructModelKey(
    provider: string,
    classification: ModelClassification,
  ): string;
}

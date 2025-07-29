import { rateLimitMetrics } from './metrics';
import type { ModelClassification } from './types';

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
  operationType: 'generate' | 'stream'
): void {
  const duration = Date.now() - startTime;
  rateLimitMetrics.recordProcessingDuration(duration, modelClassification);
  
  console.log(`${operationType} finished successfully in ${duration}ms for model ${modelClassification}`);
}

/**
 * Gets the current provider from a model key or defaults to 'azure'.
 * 
 * @param modelKey - Optional model key to extract provider from
 * @returns The provider ('azure' or 'google')
 */
export function getCurrentProvider(modelKey?: string): 'azure' | 'google' {
  if (modelKey?.includes('google')) {
    return 'google';
  }
  return 'azure'; // Default assumption
}

/**
 * Constructs a model key from provider and classification.
 * 
 * @param provider - The model provider
 * @param classification - The model classification
 * @returns The constructed model key
 */
export function constructModelKey(provider: string, classification: ModelClassification): string {
  return `${provider}:${classification}`;
}

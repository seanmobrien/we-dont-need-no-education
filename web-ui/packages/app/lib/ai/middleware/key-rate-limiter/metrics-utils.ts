import { rateLimitMetrics } from './metrics';
import { log } from '@compliance-theater/logger';
import type { ModelClassification } from './types';

export function recordRequestMetrics(
  startTime: number,
  modelClassification: ModelClassification,
  operationType: 'generate' | 'stream'
): void {
  const duration = Date.now() - startTime;
  rateLimitMetrics.recordProcessingDuration(duration, modelClassification);

  log((l) =>
    l.info(
      `${operationType} finished successfully in ${duration}ms for model ${modelClassification}`
    )
  );
}

export function getCurrentProvider(modelKey?: string): 'azure' | 'google' {
  if (modelKey?.includes('google')) {
    return 'google';
  }
  return 'azure'; // Default assumption
}

export function constructModelKey(
  provider: string,
  classification: ModelClassification
): string {
  return `${provider}:${classification}`;
}

import { log } from '@/lib/logger';
import { isModelAvailable } from '@/lib/ai/aiModelFactory';
import { rateLimitQueueManager } from './queue-manager';
import { rateLimitMetrics } from './metrics';
import type { ModelClassification, ModelFailoverConfig, RateLimitedRequest } from './types';
import { v4 as uuidv4 } from 'uuid';

// Check if model is available and get fallback if needed
export function getAvailableModel(provider: 'azure' | 'google', classification: ModelClassification): string | null {
  const modelKey = `${provider}:${classification}`;
  return isModelAvailable(modelKey) ? modelKey : null;
}

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
export async function checkModelAvailabilityAndFallback(
  currentModelKey: string,
  modelClassification: ModelClassification,
  failoverConfig: ModelFailoverConfig | undefined,
  params: Record<string, unknown>
): Promise<string | void> {
  if (!isModelAvailable(currentModelKey)) {
    log(l => l.warn(
      `Model ${currentModelKey} is disabled, attempting fallback`,
    ));

    if (failoverConfig) {
      const fallbackModelKey = getAvailableModel(
        failoverConfig.fallbackProvider,
        modelClassification,
      );
      
      if (fallbackModelKey) {
        log(l => l.info(`Using fallback model: ${fallbackModelKey}`));
        return fallbackModelKey;
        // Note: In a real implementation, we'd need to modify the params to use the fallback model
        // This would require integration with the model factory to switch providers
      } else {
        // No fallback available, enqueue for retry
        await enqueueRequestForRetry(modelClassification, params, 'no_models_available');
        
        throw new Error(
          `No ${modelClassification} models available. Request enqueued for retry.`,
        );
      }
    } else {
      // No failover config, enqueue for retry
      await enqueueRequestForRetry(modelClassification, params, 'no_models_available');
      
      throw new Error(
        `No ${modelClassification} models available. Request enqueued for retry.`,
      );
    }
  }
}

/**
 * Enqueues a request for retry processing when models are unavailable or rate limited.
 * 
 * @param modelClassification - The model classification
 * @param params - The request parameters
 * @param errorType - The type of error causing the enqueue
 * @returns The generated request ID
 */
export async function enqueueRequestForRetry(
  modelClassification: ModelClassification,
  params: Record<string, unknown>,
  errorType: string
): Promise<string> {
  const requestId = uuidv4();
  const rateLimitedRequest: RateLimitedRequest = {
    id: requestId,
    modelClassification,
    request: { params, messages: [] }, // Note: messages would come from params in real implementation
    metadata: {
      submittedAt: new Date().toISOString(),
      generation: 1,
    },
  };

  await rateLimitQueueManager.enqueueRequest(rateLimitedRequest);
  rateLimitMetrics.recordError(errorType, modelClassification);
  
  return requestId;
}

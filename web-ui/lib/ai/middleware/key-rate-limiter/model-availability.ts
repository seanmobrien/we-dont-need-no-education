import { log } from '@/lib/logger';
import { isModelAvailable } from '@/lib/ai/aiModelFactory';
import { rateLimitQueueManager } from './queue-manager';
import { rateLimitMetrics } from './metrics';
import type {
  ModelClassification,
  ModelFailoverConfig,
  RateLimitedRequest,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { RateRetryError } from '@/lib/react-util/errors/rate-retry-error';

export function getAvailableModel(
  provider: 'azure' | 'google',
  classification: ModelClassification,
): string | null {
  const modelKey = `${provider}:${classification}`;
  return isModelAvailable(modelKey) ? modelKey : null;
}

export const CHAT_RETRY_DELAY_MS = 90 * 1000; // 90 seconds

export async function checkModelAvailabilityAndFallback(
  currentModelKey: string,
  modelClassification: ModelClassification,
  failoverConfig: ModelFailoverConfig | undefined,
  params: Record<string, unknown> & {
    prompt?: unknown[];
    chatId: string;
    turnId: string;
  },
): Promise<string | void> {
  if (!isModelAvailable(currentModelKey)) {
    log((l) =>
      l.warn(`Model ${currentModelKey} is disabled, attempting fallback`),
    );

    if (failoverConfig) {
      const fallbackModelKey = getAvailableModel(
        failoverConfig.fallbackProvider,
        modelClassification,
      );

      if (fallbackModelKey) {
        log((l) => l.info(`Using fallback model: ${fallbackModelKey}`));
        return fallbackModelKey;
        // Note: In a real implementation, we'd need to modify the params to use the fallback model
        // This would require integration with the model factory to switch providers
      } else {
        // No fallback available, enqueue for retry
        const requestId = await enqueueRequestForRetry(
          modelClassification,
          params,
          'no_models_available',
        );

        throw new RateRetryError({
          chatId: params.chatId,
          turnId: params.turnId,
          retryId: requestId,
          retryAfter: new Date(Date.now() + 90000), // Retry after 1.5 minute
        });
      }
    } else {
      // No failover config, enqueue for retry
      const retryId = await enqueueRequestForRetry(
        modelClassification,
        params,
        'no_models_available',
      );

      throw new RateRetryError({
        chatId: params.chatId,
        turnId: params.turnId,
        retryId,
        retryAfter: new Date(Date.now() + 90000), // Retry after 1.5 minute
      });
    }
  }
}

export const enqueueRequestForRetry = async (
  modelClassification: ModelClassification,
  {
    prompt,
    ...params
  }: Record<string, unknown> & {
    prompt?: unknown[];
    chatId: string;
    turnId: string;
  },
  errorType: string,
): Promise<string> => {
  if (!prompt || prompt.length === 0) {
    throw new TypeError(
      'Unable to locate prompt; this request does not support delayed run enqueuing.',
    );
  }
  const requestId = uuidv4();
  const rateLimitedRequest: RateLimitedRequest = {
    id: requestId,
    modelClassification,
    request: { params, messages: prompt },
    metadata: {
      submittedAt: new Date().toISOString(),
      chatTurnId: String(params.chatTurnId ?? '1'),
      chatHistoryId: String(params.chatHistoryId ?? 'unassigned'),
      retryAfter: new Date(Date.now() + CHAT_RETRY_DELAY_MS).valueOf(), // Retry after 90 seconds
      generation: 1,
    },
  };

  await rateLimitQueueManager.enqueueRequest(rateLimitedRequest);
  rateLimitMetrics.recordError(errorType, modelClassification);

  return requestId;
};

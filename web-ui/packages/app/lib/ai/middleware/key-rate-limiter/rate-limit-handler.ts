import { getRetryErrorInfo } from '@/lib/ai/chat';
import { log } from '@compliance-theater/logger';
import { temporarilyDisableModel } from '@/lib/ai/aiModelFactory';
import { rateLimitMetrics } from './metrics';
import type { ModelClassification, ModelFailoverConfig } from './types';
import {
  enqueueRequestForRetry,
  getAvailableModel,
  CHAT_RETRY_DELAY_MS,
} from './model-availability';
import { RateRetryError } from '@compliance-theater/react/errors/rate-retry-error';

export function disableModelFromRateLimit(
  modelKey: string,
  retryAfter: number
): void {
  const disableDurationMs = Math.max(retryAfter * 1000, 60000); // At least 1 minute
  log((l) =>
    l.warn(
      `Rate limit detected for ${modelKey}, disabling for ${disableDurationMs}ms`
    )
  );
  temporarilyDisableModel(modelKey, disableDurationMs);
  rateLimitMetrics.recordError('rate_limit_disable', modelKey);
}

export async function handleRateLimitError(
  error: unknown,
  currentModelKey: string,
  modelClassification: ModelClassification,
  failoverConfig: ModelFailoverConfig | undefined,
  params: Record<string, unknown>,
  errorContext: 'generate' | 'stream' | 'stream_setup' = 'generate'
): Promise<never> {
  const rateLimitErrorInfo = getRetryErrorInfo(error);

  if (rateLimitErrorInfo?.isRetry && rateLimitErrorInfo.retryAfter) {
    log((l) =>
      l.warn(`Rate limit detected: ${rateLimitErrorInfo.retryAfter}s`)
    );

    // Disable the current model
    disableModelFromRateLimit(currentModelKey, rateLimitErrorInfo.retryAfter);

    // Try fallback if available
    if (failoverConfig) {
      const fallbackModelKey = getAvailableModel(
        failoverConfig.fallbackProvider,
        modelClassification
      );
      if (fallbackModelKey && fallbackModelKey !== currentModelKey) {
        log((l) => l.info(`Attempting fallback to: ${fallbackModelKey}`));
        // Note: Would need to retry with fallback model here
        // For now, enqueue for later processing
      }
    }

    // Enqueue for retry processing
    const errorType =
      errorContext === 'generate'
        ? 'rate_limit_enqueue'
        : errorContext === 'stream'
        ? 'stream_rate_limit'
        : 'stream_rate_limit_enqueue';

    const requestId = await enqueueRequestForRetry(
      modelClassification,
      {
        ...params,
        ...{
          chatId: 'unassigned',
          turnId: '1',
          ...((params?.providerMetadata as Record<string, unknown>)
            ?.backoffice ?? {}),
        },
      },
      errorType
    );

    // Create context-specific error message
    throw new RateRetryError({
      chatId: String(params.chatId ?? 'unassigned'),
      turnId: String(params.turnId ?? '1'),
      retryId: String(requestId),
      retryAfter: new Date(Date.now() + CHAT_RETRY_DELAY_MS),
    });
  }

  // Not a rate limit error, record as other error and rethrow
  const errorType =
    errorContext === 'generate'
      ? 'other_error'
      : errorContext === 'stream'
      ? 'stream_rate_limit'
      : 'stream_other_error';

  rateLimitMetrics.recordError(errorType, modelClassification);
  throw error;
}

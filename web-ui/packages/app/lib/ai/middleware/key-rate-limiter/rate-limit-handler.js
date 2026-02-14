import { getRetryErrorInfo } from '@/lib/ai/chat';
import { log } from '@compliance-theater/logger';
import { temporarilyDisableModel } from '@/lib/ai/aiModelFactory';
import { rateLimitMetrics } from './metrics';
import { enqueueRequestForRetry, getAvailableModel, CHAT_RETRY_DELAY_MS, } from './model-availability';
import { RateRetryError } from '@/lib/react-util/errors/rate-retry-error';
export function disableModelFromRateLimit(modelKey, retryAfter) {
    const disableDurationMs = Math.max(retryAfter * 1000, 60000);
    log((l) => l.warn(`Rate limit detected for ${modelKey}, disabling for ${disableDurationMs}ms`));
    temporarilyDisableModel(modelKey, disableDurationMs);
    rateLimitMetrics.recordError('rate_limit_disable', modelKey);
}
export async function handleRateLimitError(error, currentModelKey, modelClassification, failoverConfig, params, errorContext = 'generate') {
    const rateLimitErrorInfo = getRetryErrorInfo(error);
    if (rateLimitErrorInfo?.isRetry && rateLimitErrorInfo.retryAfter) {
        log((l) => l.warn(`Rate limit detected: ${rateLimitErrorInfo.retryAfter}s`));
        disableModelFromRateLimit(currentModelKey, rateLimitErrorInfo.retryAfter);
        if (failoverConfig) {
            const fallbackModelKey = getAvailableModel(failoverConfig.fallbackProvider, modelClassification);
            if (fallbackModelKey && fallbackModelKey !== currentModelKey) {
                log((l) => l.info(`Attempting fallback to: ${fallbackModelKey}`));
            }
        }
        const errorType = errorContext === 'generate'
            ? 'rate_limit_enqueue'
            : errorContext === 'stream'
                ? 'stream_rate_limit'
                : 'stream_rate_limit_enqueue';
        const requestId = await enqueueRequestForRetry(modelClassification, {
            ...params,
            ...{
                chatId: 'unassigned',
                turnId: '1',
                ...(params?.providerMetadata
                    ?.backoffice ?? {}),
            },
        }, errorType);
        throw new RateRetryError({
            chatId: String(params.chatId ?? 'unassigned'),
            turnId: String(params.turnId ?? '1'),
            retryId: String(requestId),
            retryAfter: new Date(Date.now() + CHAT_RETRY_DELAY_MS),
        });
    }
    const errorType = errorContext === 'generate'
        ? 'other_error'
        : errorContext === 'stream'
            ? 'stream_rate_limit'
            : 'stream_other_error';
    rateLimitMetrics.recordError(errorType, modelClassification);
    throw error;
}
//# sourceMappingURL=rate-limit-handler.js.map
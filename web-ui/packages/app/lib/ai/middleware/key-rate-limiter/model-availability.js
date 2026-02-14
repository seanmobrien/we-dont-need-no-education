import { log } from '@compliance-theater/logger';
import { isModelAvailable } from '@/lib/ai/aiModelFactory';
import { rateLimitQueueManager } from './queue-manager';
import { rateLimitMetrics } from './metrics';
import { v4 as uuidv4 } from 'uuid';
import { RateRetryError } from '@/lib/react-util/errors/rate-retry-error';
export function getAvailableModel(provider, classification) {
    const modelKey = `${provider}:${classification}`;
    return isModelAvailable(modelKey) ? modelKey : null;
}
export const CHAT_RETRY_DELAY_MS = 90 * 1000;
export async function checkModelAvailabilityAndFallback(currentModelKey, modelClassification, failoverConfig, params) {
    if (!isModelAvailable(currentModelKey)) {
        log((l) => l.warn(`Model ${currentModelKey} is disabled, attempting fallback`));
        if (failoverConfig) {
            const fallbackModelKey = getAvailableModel(failoverConfig.fallbackProvider, modelClassification);
            if (fallbackModelKey) {
                log((l) => l.info(`Using fallback model: ${fallbackModelKey}`));
                return fallbackModelKey;
            }
            else {
                const requestId = await enqueueRequestForRetry(modelClassification, params, 'no_models_available');
                throw new RateRetryError({
                    chatId: params.chatId,
                    turnId: params.turnId,
                    retryId: requestId,
                    retryAfter: new Date(Date.now() + 90000),
                });
            }
        }
        else {
            const retryId = await enqueueRequestForRetry(modelClassification, params, 'no_models_available');
            throw new RateRetryError({
                chatId: params.chatId,
                turnId: params.turnId,
                retryId,
                retryAfter: new Date(Date.now() + 90000),
            });
        }
    }
}
export const enqueueRequestForRetry = async (modelClassification, { prompt, ...params }, errorType) => {
    if (!prompt || prompt.length === 0) {
        throw new TypeError('Unable to locate prompt; this request does not support delayed run enqueuing.');
    }
    const requestId = uuidv4();
    const rateLimitedRequest = {
        id: requestId,
        modelClassification,
        request: { params, messages: prompt },
        metadata: {
            submittedAt: new Date().toISOString(),
            chatTurnId: String(params.chatTurnId ?? '1'),
            chatHistoryId: String(params.chatHistoryId ?? 'unassigned'),
            retryAfter: new Date(Date.now() + CHAT_RETRY_DELAY_MS).valueOf(),
            generation: 1,
        },
    };
    await rateLimitQueueManager.enqueueRequest(rateLimitedRequest);
    rateLimitMetrics.recordError(errorType, modelClassification);
    return requestId;
};
//# sourceMappingURL=model-availability.js.map
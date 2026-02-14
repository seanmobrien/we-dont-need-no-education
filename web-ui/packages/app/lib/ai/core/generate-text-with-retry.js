import { isRateRetryError } from '@/lib/react-util/errors/rate-retry-error';
import { generateText } from 'ai';
import { rateLimitQueueManager } from '../middleware/key-rate-limiter/queue-manager';
import { LoggedError } from '@compliance-theater/logger';
export const generateTextWithRetry = async ({ maxRetries = 5, retryTimeout, ...props }) => {
    let tries = 0;
    let retryId = undefined;
    while (tries < maxRetries) {
        try {
            if (retryId) {
                const response = await rateLimitQueueManager.getResponse(retryId);
                if (response?.response) {
                    return response.response;
                }
                else {
                    tries++;
                    if (tries >= maxRetries) {
                        throw new Error('Maximum number of retries exceeded');
                    }
                    await new Promise((resolve) => setTimeout(resolve, retryTimeout));
                }
            }
            else {
                const llmRet = await generateText(props);
                return llmRet;
            }
        }
        catch (error) {
            const normalError = LoggedError.isLoggedError(error)
                ? error.error
                : error;
            tries++;
            if (tries >= maxRetries || !isRateRetryError(normalError)) {
                throw error;
            }
            retryId = normalError.retryId;
            await new Promise((resolve) => setTimeout(resolve, Math.max(20 * 1000, normalError.retryAfter.valueOf() - Date.now())));
        }
    }
    throw new Error(`Max retries exceeded processing request`);
};
//# sourceMappingURL=generate-text-with-retry.js.map
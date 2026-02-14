import { isSuccessfulResponse, isProblematicResponse, } from './responseClassifiers';
import { cacheSuccessfulResponse, handleCacheJail } from './cacheOperations';
import { getCacheConfig } from './config';
import { log } from '@compliance-theater/logger';
const config = getCacheConfig();
export const handleResponseCaching = async (redis, cacheKey, response, context = '') => {
    const isSuccessful = isSuccessfulResponse(response);
    const isProblematic = isProblematicResponse(response);
    if (isSuccessful) {
        await cacheSuccessfulResponse(redis, cacheKey, response, context);
    }
    else if (isProblematic) {
        await handleCacheJail(redis, cacheKey, response, context);
    }
    else {
        if (config.enableLogging) {
            log((l) => l.warn(`❌ Not caching ${context}response (finishReason: ${response.finishReason}, hasText: ${!!(response.content && response.content.length > 0)}) for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`));
        }
    }
};
//# sourceMappingURL=cacheStrategy.js.map
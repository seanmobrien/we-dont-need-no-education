import { getCacheConfig } from './config';
import { metricsCollector } from './metrics';
import { createJailKey } from './cacheKeys';
import { log, LoggedError } from '@compliance-theater/logger';
const config = getCacheConfig();
export const cacheSuccessfulResponse = async (redis, cacheKey, response, context = '') => {
    const extractText = (content) => {
        return content
            .map((item) => (item.type === 'text' ? item.text : ''))
            .filter((text) => text.length > 0)
            .join(' ');
    };
    try {
        const extractedText = extractText(response.content);
        await redis.setEx(cacheKey, config.cacheTtl, JSON.stringify({
            text: extractedText,
            finishReason: response.finishReason,
            usage: response.usage,
            warnings: response.warnings,
            rawCall: response.rawCall,
            rawResponse: response.rawResponse,
            response: response.response,
        }));
        const responseSize = extractedText?.length || 0;
        if (config.enableMetrics) {
            metricsCollector.recordStore(cacheKey, responseSize);
        }
        if (config.enableLogging) {
            log((l) => l.verbose(`💾 Cached successful ${context}response for key: ${cacheKey.substring(0, config.maxKeyLogLength)}...`));
        }
    }
    catch (cacheStoreError) {
        if (config.enableMetrics) {
            metricsCollector.recordError(cacheKey, String(cacheStoreError));
        }
        if (config.enableLogging) {
            LoggedError.isTurtlesAllTheWayDownBaby(cacheStoreError, {
                message: `Error storing ${context}response in cache`,
                data: {
                    cacheKey,
                },
                source: 'cacheWithRedis',
                log: true,
            });
        }
    }
};
export const handleCacheJail = async (redis, cacheKey, response, context = '') => {
    const jailKey = createJailKey(cacheKey);
    debugger;
    try {
        const jailData = await redis.get(jailKey);
        const jailEntry = jailData
            ? JSON.parse(jailData)
            : { count: 0, firstSeen: Date.now() };
        jailEntry.count += 1;
        jailEntry.lastSeen = Date.now();
        jailEntry.lastResponse = {
            finishReason: response.finishReason || 'unknown',
            hasWarnings: !!(response.warnings && response.warnings.length > 0),
            textLength: response.content?.reduce((acc, part) => acc + (part.type === 'text' ? part.text.length : 0), 0) || 0,
        };
        await redis.setEx(jailKey, config.jailTtl, JSON.stringify(jailEntry));
        if (config.enableMetrics) {
            metricsCollector.recordJailUpdate(cacheKey, jailEntry.count, config.jailThreshold);
        }
        if (config.enableLogging) {
            log((l) => l.verbose(`🏪 ${context}cache jail updated for key ${cacheKey.substring(0, config.maxKeyLogLength)}... (count: ${jailEntry.count}/${config.jailThreshold})`));
        }
        if (jailEntry.count >= config.jailThreshold) {
            if (config.enableLogging) {
                log((l) => l.verbose(`🔓 ${context}cache jail threshold reached for key ${cacheKey.substring(0, config.maxKeyLogLength)}... - promoting to cache`));
            }
            await cacheSuccessfulResponse(redis, cacheKey, response, `${context}problematic `);
            if (config.enableMetrics) {
                const responseSize = response.content?.reduce((acc, part) => acc + (part.type === 'text' ? part.text.length : 0), 0) || 0;
                metricsCollector.recordJailPromotion(cacheKey, responseSize);
            }
        }
    }
    catch (jailError) {
        if (config.enableMetrics) {
            metricsCollector.recordError(cacheKey, String(jailError));
        }
        if (config.enableLogging) {
            LoggedError.isTurtlesAllTheWayDownBaby(jailError, {
                log: true,
                source: 'cacheWithRedis',
            });
        }
    }
};
//# sourceMappingURL=cacheOperations.js.map
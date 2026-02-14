function parseIntEnv(envVar, defaultValue) {
    if (!envVar)
        return defaultValue;
    const parsed = parseInt(envVar, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
function parseBoolEnv(envVar, defaultValue) {
    if (!envVar)
        return defaultValue;
    return envVar.toLowerCase() === 'true' || envVar === '1';
}
export function getCacheConfig() {
    return {
        cacheTtl: parseIntEnv(process.env.AI_CACHE_TTL, 86400),
        jailThreshold: parseIntEnv(process.env.AI_CACHE_JAIL_THRESHOLD, 3),
        jailTtl: parseIntEnv(process.env.AI_CACHE_JAIL_TTL, 86400),
        streamChunkSize: parseIntEnv(process.env.AI_CACHE_STREAM_CHUNK_SIZE, 5),
        enableLogging: parseBoolEnv(process.env.AI_CACHE_ENABLE_LOGGING, true),
        enableMetrics: parseBoolEnv(process.env.AI_CACHE_ENABLE_METRICS, true),
        cacheKeyPrefix: process.env.AI_CACHE_KEY_PREFIX || 'ai-cache',
        jailKeyPrefix: process.env.AI_CACHE_JAIL_KEY_PREFIX || 'ai-jail',
        maxKeyLogLength: parseIntEnv(process.env.AI_CACHE_MAX_KEY_LOG_LENGTH, 20),
    };
}
export function validateCacheConfig(config) {
    if (config.cacheTtl <= 0) {
        throw new Error('Cache TTL must be positive');
    }
    if (config.jailThreshold <= 0) {
        throw new Error('Jail threshold must be positive');
    }
    if (config.jailTtl <= 0) {
        throw new Error('Jail TTL must be positive');
    }
    if (config.streamChunkSize <= 0) {
        throw new Error('Stream chunk size must be positive');
    }
    if (config.maxKeyLogLength <= 0) {
        throw new Error('Max key log length must be positive');
    }
}
//# sourceMappingURL=config.js.map
import type { CacheStrategyDeps, CacheResult, CachedValue, SpanLike } from './fetch-types';
export declare class CacheStrategies {
    private deps;
    constructor(deps: CacheStrategyDeps);
    tryMemoryCache(cacheKey: string, span: SpanLike): Promise<CacheResult>;
    tryRedisCache(cacheKey: string, span: SpanLike): Promise<CacheResult>;
    tryInflightDedupe(cacheKey: string, span: SpanLike): Promise<CacheResult>;
    cacheBufferedToRedis(cacheKey: string, value: CachedValue): Promise<void>;
    cacheStreamToRedis(cacheKey: string, stream: AsyncIterable<Buffer>, headers: Record<string, string>, statusCode: number, alreadyConsumedChunks?: Buffer[]): Promise<void>;
}
//# sourceMappingURL=cache-strategies.d.ts.map
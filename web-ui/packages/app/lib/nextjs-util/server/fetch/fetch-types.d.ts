import { EnhancedFetchConfig } from '@compliance-theater/feature-flags/types';
import type { LRUCache } from 'lru-cache';
import type { RedisClientType } from 'redis';
export type FetchConfig = {
    fetch_concurrency?: number;
    fetch_stream_detect_buffer?: number;
    fetch_stream_buffer_max?: number;
    fetch_cache_ttl?: number;
    enhanced?: boolean;
    timeout: EnhancedFetchConfig['timeout'];
    trace_level?: string;
    stream_enabled?: boolean;
    fetch_stream_max_chunks?: number;
    fetch_stream_max_total_bytes?: number;
    dedup_writerequests?: boolean;
};
export interface CachedValue {
    body: Buffer;
    headers: Record<string, string>;
    statusCode: number;
}
export interface StreamingConfig {
    streamEnabled: boolean;
    streamDetectBuffer: number;
    streamBufferMax: number;
    streamMaxChunks: number;
    streamMaxTotalBytes: number;
}
export interface BufferingConfig {
    maxResponseSize: number;
    streamDetectBuffer: number;
    streamBufferMax: number;
}
export interface CachingConfig {
    cacheTtl: number;
    redisEnabled: boolean;
}
export interface CacheStrategyDeps {
    cache: LRUCache<string, Promise<CachedValue>>;
    inflightMap: Map<string, Promise<CachedValue>>;
    getRedisClient: () => Promise<RedisClientType>;
    fetchConfig: () => Required<FetchConfig>;
}
export interface StreamingStrategyDeps {
    config: StreamingConfig;
    cacheStreamToRedis: (cacheKey: string, stream: AsyncIterable<Buffer>, headers: Record<string, string>, statusCode: number, alreadyBufferedChunks: Buffer[]) => Promise<void>;
    fetchConfig: () => Required<FetchConfig>;
    releaseSemaphore: () => void;
}
export interface BufferingStrategyDeps {
    config: BufferingConfig;
    cachingConfig: CachingConfig;
    cache: LRUCache<string, Promise<CachedValue>>;
    cacheStreamToRedis: (cacheKey: string, stream: AsyncIterable<Buffer>, headers: Record<string, string>, statusCode: number, alreadyBufferedChunks: Buffer[]) => Promise<void>;
    getRedisClient: () => Promise<any>;
    fetchConfig: () => Required<FetchConfig>;
    releaseSemaphore: () => void;
}
export type CacheResult = Response | undefined;
export interface SpanLike {
    setAttribute(key: string, value: string | number | boolean): void;
    setAttributes(attributes: Record<string, string | number | boolean>): void;
    recordException(exception: Error): void;
    setStatus(status: {
        code: number;
        message?: string;
    }): void;
}
export type RequestInfo = string | URL | Request;
export type RequestInit = {
    body?: BodyInit | null;
    cache?: RequestCache;
    credentials?: RequestCredentials;
    headers?: Record<string, string | string[]> | Headers | [string, string | string[]][];
    integrity?: string;
    keepalive?: boolean;
    method?: string;
    mode?: RequestMode;
    priority?: RequestPriority;
    redirect?: RequestRedirect;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
    signal?: AbortSignal | null;
    timeout?: number;
    window?: null;
};
export type NormalizedRequestInit = Omit<RequestInit, 'headers'> & {
    headers?: Record<string, string | string[]>;
};
export type ServerFetchManager = {
    fetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
    [Symbol.dispose](): void;
};
//# sourceMappingURL=fetch-types.d.ts.map
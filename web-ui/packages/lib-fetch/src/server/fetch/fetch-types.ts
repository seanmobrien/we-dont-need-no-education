import type {
    RequestInfo,
    RequestInit,
    Response as ResponseType,
    Request as RequestType
} from '../../fetch/shared-types';

export type EnhancedFetchConfigTimeout = {
    lookup?: number;
    connect?: number;
    secureConnect?: number;
    socket?: number;
    send?: number;
    response?: number;
    request?: number;
};

export type FetchConfig = {
    fetch_concurrency?: number;
    fetch_stream_detect_buffer?: number;
    fetch_stream_buffer_max?: number;
    fetch_cache_ttl?: number;
    fetch_stream_max_chunks?: number;
    fetch_stream_max_total_bytes?: number;
    enhanced?: boolean;
    timeout: EnhancedFetchConfigTimeout;
    stream_enabled?: boolean;
    dedup_writerequests?: boolean;
};

export interface CachedValue {
    body: Buffer;
    headers: Record<string, string>;
    statusCode: number;
}

export type CacheStrategyDeps = {
    cache: Map<string, Promise<CachedValue>>;
    inflightMap: Map<string, Promise<CachedValue>>;
    getRedisClient: () => Promise<import('@compliance-theater/redis').RedisClientType>;
    fetchConfig: () => Required<FetchConfig>;
};

export type ServerFetchManager = {
    fetch: (url: RequestInfo | URL | string, init?: RequestInit) => Promise<ResponseType>;
    [Symbol.dispose](): void;
};

export type FetchRequest = RequestType;
export type FetchResponse = ResponseType;
export type Request = RequestType;
export type Response = ResponseType;

export type {
    RequestInfo,
    RequestInit
};

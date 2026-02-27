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

export type ServerFetchManager = {
    fetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
    [Symbol.dispose](): void;
};

import got, {
    type OptionsInit,
    type OptionsOfBufferResponseBody,
    type Response as GotResponse,
} from 'got';
import type { IncomingMessage } from 'http';
import type { Readable } from 'stream';
import { LRUCache } from 'lru-cache';
import { getRedisClient } from '@compliance-theater/redis';
import { Semaphore, SemaphoreManager } from '../semaphore-manager';
import {
    FETCH_MANAGER_SINGLETON_KEY,
    fetchConfig,
    fetchConfigSync,
} from './fetch-config';
import { makeResponse, webStreamToReadable } from '../response';
import { CacheStrategies } from './cache-strategies';
import { StreamingStrategy } from './streaming-strategy';
import { BufferingStrategy } from './buffering-strategy';
import type { CachedValue, RequestInfo, RequestInit, ServerFetchManager } from './fetch-types';

type RequestInitWithTimeout = Omit<RequestInit, 'timeout'> & {
    timeout?: number | Record<string, number | undefined>;
};

const DEFAULT_CONFIG = {
    concurrency: 8,
    cacheSize: 500,
    streamDetectBuffer: 4 * 1024,
    streamBufferMax: 64 * 1024,
    maxResponseSize: 10 * 1024 * 1024,
};

const mergeHeaders = (
    target: Record<string, string | string[] | undefined>,
    source:
        | Headers
        | Record<string, string | string[]>
        | [string, string | string[]][]
        | undefined,
) => {
    if (!source) return;

    const getMatchingKey = (obj: Record<string, unknown>, key: string) => {
        const lower = key.toLowerCase();
        return Object.keys(obj).find((k) => k.toLowerCase() === lower) || key;
    };

    const processEntry = (
        key: string,
        value: string | string[] | undefined | null,
    ) => {
        if (value === undefined || value === null) return;

        const matchingKey = getMatchingKey(target as Record<string, unknown>, key);
        const existing = target[matchingKey];

        if (existing !== undefined) {
            if (Array.isArray(existing)) {
                target[matchingKey] = Array.isArray(value)
                    ? [...existing, ...value]
                    : [...existing, value];
            } else {
                target[matchingKey] = Array.isArray(value)
                    ? [existing, ...value]
                    : [existing, value];
            }
        } else {
            target[matchingKey] = value;
        }
    };

    if (source instanceof Headers) {
        source.forEach((v, k) => processEntry(k, v));
    } else if (Array.isArray(source)) {
        source.forEach(([k, v]) => processEntry(k, v));
    } else {
        Object.entries(source).forEach(([k, v]) => processEntry(k, v));
    }
};

export const normalizeRequestInit = ({
    requestInfo,
    requestInit: { timeout: initTimeout, ...requestInit } = {},
    defaults = {},
}: {
    requestInfo: RequestInfo;
    requestInit?: RequestInitWithTimeout;
    defaults?: Partial<OptionsInit>;
}): [string, OptionsInit] => {
    let url: string;
    let init: Omit<RequestInitWithTimeout, 'timeout'> & {
        timeout?: Record<string, number | undefined>;
    } = {
        ...requestInit,
    };

    if (init.body instanceof URLSearchParams) {
        init.body = init.body.toString();
    }

    if (!requestInfo) {
        throw new Error('Invalid requestInfo');
    }

    if (initTimeout) {
        init.timeout =
            typeof initTimeout === 'number'
                ? { connect: initTimeout, socket: initTimeout }
                : initTimeout;
    }

    if (typeof requestInfo === 'string') {
        url = requestInfo;
    } else if (requestInfo instanceof URL) {
        url = requestInfo.toString();
    } else if ('url' in requestInfo) {
        const infoTimeout = (requestInfo as Request & { timeout?: unknown }).timeout;
        if (typeof infoTimeout === 'number') {
            init.timeout = {
                connect: infoTimeout,
                socket: infoTimeout,
                ...(init.timeout ?? {}),
            };
        } else if (typeof infoTimeout === 'object' && infoTimeout) {
            init.timeout = {
                ...(infoTimeout as Record<string, number | undefined>),
                ...(init.timeout ?? {}),
            };
        }

        init = {
            ...((requestInfo as unknown as Record<string, unknown>) ?? {}),
            ...init,
        } as typeof init;

        delete (init as unknown as Record<string, unknown>).url;
        url = requestInfo.url;
    } else {
        throw new Error('Invalid requestInfo');
    }

    const options: OptionsInit = {
        method: 'GET',
        ...defaults,
        ...init,
        timeout: {
            ...((defaults.timeout as Record<string, number | undefined>) ?? {}),
            ...(init.timeout ?? {}),
        },
    } as OptionsInit;

    const headers: Record<string, string | string[] | undefined> = {};
    if (defaults.headers) {
        mergeHeaders(headers, defaults.headers as unknown as Headers);
    }
    if (init.headers) {
        mergeHeaders(headers, init.headers);
    }
    options.headers = headers;

    const cleanOptions: OptionsInit = {};
    for (const [k, v] of Object.entries(options)) {
        if (v !== undefined && v !== null && v !== false) {
            (cleanOptions as Record<string, unknown>)[k] = v;
        }
    }

    return [url, cleanOptions];
};

const singleton = new Map<string, FetchManager>();

export class FetchManager implements ServerFetchManager {
    private readonly cache: LRUCache<string, Promise<CachedValue>>;
    private readonly cacheMap: Map<string, Promise<CachedValue>>;
    private readonly inflight = new Map<string, Promise<CachedValue>>();
    private readonly semManager: SemaphoreManager;
    private readonly cacheStrategies: CacheStrategies;
    private readonly streamingStrategy: StreamingStrategy;
    private readonly bufferingStrategy: BufferingStrategy;

    constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
        const finalConfig = { ...DEFAULT_CONFIG, ...config };
        this.cache = new LRUCache({
            max: finalConfig.cacheSize,
            updateAgeOnGet: true,
        });
        this.cacheMap = this.cache as unknown as Map<string, Promise<CachedValue>>;

        const fetchCfg = fetchConfigSync();
        const concurrency = fetchCfg.fetch_concurrency ?? finalConfig.concurrency;
        this.semManager = new SemaphoreManager(new Semaphore(concurrency));

        this.cacheStrategies = new CacheStrategies({
            cache: this.cacheMap,
            inflightMap: this.inflight,
            getRedisClient,
            fetchConfig: fetchConfigSync,
        });
        this.streamingStrategy = new StreamingStrategy();
        this.bufferingStrategy = new BufferingStrategy(
            this.cacheMap,
            fetchCfg.fetch_stream_detect_buffer,
            fetchCfg.fetch_stream_buffer_max,
            finalConfig.maxResponseSize,
        );
    }

    [Symbol.dispose](): void {
        this.cache.clear();
        this.inflight.clear();
    }

    private async doGotFetch(url: string, init?: RequestInit) {
        const [, gotOptions] = normalizeRequestInit({
            requestInfo: url,
            requestInit: init,
            defaults: {
                method: 'GET',
                isStream: false,
                retry: { limit: 1 },
                throwHttpErrors: false,
                responseType: 'buffer',
            },
        });

        await this.semManager.sem.acquire();
        try {
            const res: GotResponse<Buffer> = await got(
                url,
                gotOptions as unknown as OptionsOfBufferResponseBody,
            );
            const headersObj: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers || {})) {
                if (Array.isArray(v)) headersObj[k] = v.join(',');
                else if (v === undefined) continue;
                else headersObj[k] = String(v);
            }
            return {
                body: res.rawBody,
                headers: headersObj,
                statusCode: res.statusCode,
            };
        } finally {
            this.semManager.sem.release();
        }
    }

    async fetch(input: RequestInfo, init?: RequestInitWithTimeout): Promise<Response> {
        const cfg = await fetchConfig();
        const [url, normalInit] = normalizeRequestInit({
            requestInfo: input,
            requestInit: init,
            defaults: {
                timeout: cfg.timeout,
            },
        });

        const method = (normalInit.method || 'GET').toUpperCase();
        const cacheKey = `${method}:${url}`;

        if (method === 'GET') {
            const memoryCached = await this.cacheStrategies.tryMemoryCache(cacheKey);
            if (memoryCached) return memoryCached;

            const redisCached = await this.cacheStrategies.tryRedisCache(cacheKey);
            if (redisCached) return redisCached;

            const inflightCached = await this.cacheStrategies.tryInflightDedupe(cacheKey);
            if (inflightCached) return inflightCached;

            await this.semManager.sem.acquire();
            try {
                const stream = got.stream(url, {
                    method: 'GET',
                    headers: normalInit.headers,
                    retry: { limit: 1 },
                    timeout: normalInit.timeout,
                    isStream: true,
                });

                const resHead: {
                    statusCode?: number;
                    headers?: Record<string, string | string[]>;
                } = await new Promise((resolve, reject) => {
                    const onResponse = (res: IncomingMessage) => {
                        stream.removeListener('response', onResponse);
                        stream.removeListener('error', onError);
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers as Record<string, string | string[]>,
                        });
                    };
                    const onError = (err: Error) => {
                        stream.removeListener('response', onResponse);
                        stream.removeListener('error', onError);
                        reject(err);
                    };
                    stream.on('response', onResponse);
                    stream.on('error', onError);
                });

                const headersLower: Record<string, string> = {};
                for (const [k, v] of Object.entries(resHead.headers || {})) {
                    headersLower[k.toLowerCase()] = Array.isArray(v)
                        ? v.join(',')
                        : String(v ?? '');
                }

                const isStreaming = this.streamingStrategy.detectStreamingResponse(headersLower);
                if (isStreaming) {
                    return this.streamingStrategy.handlePureStreaming(
                        stream,
                        headersLower,
                        resHead.statusCode ?? 200,
                        () => this.semManager.sem.release(),
                    );
                }

                const buffered = await this.bufferingStrategy.handleBufferedResponse(
                    cacheKey,
                    stream,
                    headersLower,
                    resHead.statusCode ?? 200,
                    () => this.semManager.sem.release(),
                );

                const cloned = buffered.clone();
                const body = Buffer.from(await cloned.arrayBuffer());
                void this.cacheStrategies.cacheBufferedToRedis(cacheKey, {
                    body,
                    headers: headersLower,
                    statusCode: resHead.statusCode ?? 200,
                });

                return buffered;
            } catch (error) {
                this.semManager.sem.release();
                throw error;
            }
        }

        const result = await this.doGotFetch(url, normalInit as unknown as RequestInit);
        return makeResponse(result);
    }

    async fetchStream(input: RequestInfo, init?: RequestInitWithTimeout): Promise<Readable> {
        const cfg = await fetchConfig();
        const [url, options] = normalizeRequestInit({
            requestInfo: input,
            requestInit: init,
            defaults: {
                method: 'GET',
                isStream: true,
                retry: { limit: 1 },
                timeout: cfg.timeout,
            },
        });

        await this.semManager.sem.acquire();
        try {
            const stream = got.stream(url, {
                ...options,
                isStream: true,
            });
            const release = () => {
                try {
                    this.semManager.sem.release();
                } catch {
                    // no-op
                }
            };
            stream.on('end', release);
            stream.on('error', release);
            return stream;
        } catch (error) {
            this.semManager.sem.release();
            throw error;
        }
    }
}

export const getFetchManager = (): FetchManager => {
    const existing = singleton.get(FETCH_MANAGER_SINGLETON_KEY);
    if (existing) return existing;
    const instance = new FetchManager();
    singleton.set(FETCH_MANAGER_SINGLETON_KEY, instance);
    return instance;
};

export const serverFetch = async (
    input: RequestInfo,
    init?: RequestInitWithTimeout,
): Promise<Response> => getFetchManager().fetch(input, init);

export const fetchStream = async (
    input: RequestInfo,
    init?: RequestInitWithTimeout,
): Promise<Readable> => getFetchManager().fetchStream(input, init);

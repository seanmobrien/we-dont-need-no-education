import got from 'got';
import { LRUCache } from 'lru-cache';
import { SemaphoreManager, Semaphore, } from '@/lib/nextjs-util/semaphore-manager';
import { getRedisClient } from '@compliance-theater/redis';
import { makeResponse, webStreamToReadable } from '../response';
import { fetchConfig, fetchConfigSync, FETCH_MANAGER_SINGLETON_KEY, } from './fetch-config';
import { LoggedError, log, safeSerialize } from '@compliance-theater/logger';
import { createInstrumentedSpan } from '../utils';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { CacheStrategies } from './cache-strategies';
import { StreamingStrategy } from './streaming-strategy';
import { BufferingStrategy } from './buffering-strategy';
import { AllFeatureFlagsDefault } from '@compliance-theater/feature-flags/known-feature-defaults';
import { withTimeout } from '../../with-timeout';
import { TimeoutError } from '@/lib/react-util/errors/timeout-error';
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_CACHE_SIZE = 500;
const DEFAULT_STREAM_DETECT_BUFFER = 4 * 1024;
const DEFAULT_STREAM_BUFFER_MAX = 64 * 1024;
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_CONFIG = {
    concurrency: DEFAULT_CONCURRENCY,
    cacheSize: DEFAULT_CACHE_SIZE,
    streamDetectBuffer: DEFAULT_STREAM_DETECT_BUFFER,
    streamBufferMax: DEFAULT_STREAM_BUFFER_MAX,
    maxResponseSize: DEFAULT_MAX_RESPONSE_SIZE,
    timeout: AllFeatureFlagsDefault.models_fetch_enhanced.timeout,
};
const mergeHeaders = (target, source) => {
    if (!source)
        return;
    const getMatchingKey = (obj, key) => {
        const lower = key.toLowerCase();
        return Object.keys(obj).find((k) => k.toLowerCase() === lower) || key;
    };
    const processEntry = (key, value) => {
        if (value === undefined || value === null)
            return;
        const matchingKey = getMatchingKey(target, key);
        const existing = target[matchingKey];
        if (matchingKey.toLowerCase() === 'user-agent') {
            const existingStr = Array.isArray(existing)
                ? existing.join(' ')
                : existing;
            const newStr = Array.isArray(value) ? value.join(' ') : value;
            if (existingStr) {
                target[matchingKey] = `${existingStr} ${newStr}`;
            }
            else {
                target[matchingKey] = newStr;
            }
            return;
        }
        if (existing !== undefined) {
            if (Array.isArray(existing)) {
                if (Array.isArray(value)) {
                    target[matchingKey] = [...existing, ...value];
                }
                else {
                    target[matchingKey] = [...existing, value];
                }
            }
            else {
                if (Array.isArray(value)) {
                    target[matchingKey] = [existing, ...value];
                }
                else {
                    target[matchingKey] = [existing, value];
                }
            }
        }
        else {
            target[matchingKey] = value;
        }
    };
    if (source instanceof Headers) {
        source.forEach((v, k) => processEntry(k, v));
    }
    else if (Array.isArray(source)) {
        source.forEach(([k, v]) => processEntry(k, v));
    }
    else {
        Object.entries(source).forEach(([k, v]) => processEntry(k, v));
    }
};
export const normalizeRequestInit = ({ requestInfo, requestInit: { timeout: initTimeout, ...requestInit } = {}, defaults: { timeout: defaultTimeouts, ...defaults } = {}, }) => {
    let url;
    let init = {
        ...requestInit,
    };
    if (init.body instanceof URLSearchParams) {
        init.body = init.body.toString();
        if (!init.headers) {
            init.headers = {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            };
        }
        else if (Array.isArray(init.headers)) {
            init.headers.push([
                'Content-Type',
                'application/x-www-form-urlencoded;charset=UTF-8',
            ]);
        }
        else if (init.headers instanceof Headers) {
            if (!init.headers.has('Content-Type')) {
                init.headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
            }
        }
        else {
            const hasContentType = Object.keys(init.headers).some((k) => k.toLowerCase() === 'content-type');
            if (!hasContentType) {
                init.headers = {
                    ...init.headers,
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                };
            }
        }
    }
    if (!requestInfo) {
        throw new Error('Invalid requestInfo');
    }
    if (initTimeout) {
        init.timeout =
            typeof initTimeout === 'number'
                ? {
                    connect: initTimeout,
                    socket: initTimeout,
                }
                : initTimeout;
    }
    if (typeof requestInfo === 'string') {
        url = requestInfo;
    }
    else if (requestInfo instanceof URL) {
        url = requestInfo.toString();
    }
    else if ('url' in requestInfo) {
        if ('timeout' in requestInfo && !!requestInfo.timeout) {
            if (typeof requestInfo.timeout === 'number') {
                init.timeout = {
                    connect: requestInfo.timeout,
                    socket: requestInfo.timeout,
                    ...init.timeout,
                };
            }
            else if (typeof requestInfo.timeout === 'object') {
                init.timeout = {
                    ...requestInfo.timeout,
                    ...init.timeout,
                };
            }
            else {
                log((l) => l.warn(`Unrecognized timeout type: ${requestInfo.timeout}`));
            }
        }
        init = {
            ...{
                ...requestInfo,
                timeout: undefined,
                url: undefined,
            },
            ...init,
        };
        url = requestInfo.url;
    }
    else {
        throw new Error('Invalid requestInfo');
    }
    const options = {
        method: 'GET',
        ...defaults,
        ...init,
        timeout: {
            ...defaultTimeouts,
            ...(init.timeout ?? {}),
        },
    };
    const headers = {};
    if (defaults?.headers) {
        mergeHeaders(headers, defaults.headers);
    }
    if (init.headers) {
        mergeHeaders(headers, init.headers);
    }
    options.headers = headers;
    const cleanOptions = {};
    for (const [k, v] of Object.entries(options)) {
        const key = k;
        if (!!v) {
            cleanOptions[key] = v;
        }
    }
    if (cleanOptions.timeout && init.timeout) {
        const theTimeout = cleanOptions.timeout;
        const initTimeout = init.timeout;
        Object.entries(initTimeout).forEach(([k, v]) => {
            if (!v) {
                delete theTimeout[k];
            }
        });
    }
    return [url, cleanOptions];
};
export class FetchManager {
    cache;
    inflight = new Map();
    semManager;
    lastObservedConcurrency;
    streamDetectBuffer;
    streamBufferMax;
    config;
    cacheStrategies;
    streamingStrategy;
    bufferingStrategy;
    _pendingConfigRefresh = null;
    dedupWriteRequests = true;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new LRUCache({
            max: this.config.cacheSize,
            updateAgeOnGet: true,
        });
        let initialConcurrency = this.config.concurrency;
        try {
            const cfg = fetchConfigSync();
            initialConcurrency = cfg.fetch_concurrency ?? this.config.concurrency;
        }
        catch (err) {
            LoggedError.isTurtlesAllTheWayDownBaby(err, {
                source: 'fetch-manager:init',
                log: true,
            });
        }
        this.lastObservedConcurrency = initialConcurrency;
        const sem = new Semaphore(initialConcurrency);
        this.semManager = new SemaphoreManager(sem);
        this.streamDetectBuffer = this.config.streamDetectBuffer;
        this.streamBufferMax = this.config.streamBufferMax;
        this.cacheStrategies = new CacheStrategies({
            cache: this.cache,
            inflightMap: this.inflight,
            getRedisClient,
            fetchConfig: fetchConfigSync,
        });
        this.streamingStrategy = new StreamingStrategy({
            config: {
                streamEnabled: true,
                streamDetectBuffer: this.streamDetectBuffer,
                streamBufferMax: this.streamBufferMax,
                streamMaxChunks: 100,
                streamMaxTotalBytes: 10 * 1024 * 1024,
            },
            cacheStreamToRedis: this.cacheStrategies.cacheStreamToRedis.bind(this.cacheStrategies),
            fetchConfig: fetchConfigSync,
            releaseSemaphore: () => this.semManager.sem.release(),
        });
        this.bufferingStrategy = new BufferingStrategy({
            config: {
                streamDetectBuffer: this.streamDetectBuffer,
                streamBufferMax: this.streamBufferMax,
                maxResponseSize: this.config.maxResponseSize,
            },
            cachingConfig: {
                cacheTtl: 300,
                redisEnabled: true,
            },
            cache: this.cache,
            cacheStreamToRedis: this.cacheStrategies.cacheStreamToRedis.bind(this.cacheStrategies),
            getRedisClient,
            fetchConfig: fetchConfigSync,
            releaseSemaphore: () => this.semManager.sem.release(),
        });
    }
    async loadConfig() {
        const cfg = await fetchConfig();
        const newConcurrency = cfg.fetch_concurrency ?? DEFAULT_CONCURRENCY;
        if (newConcurrency !== this.lastObservedConcurrency) {
            try {
                this.semManager.resize(newConcurrency);
                this.lastObservedConcurrency = newConcurrency;
                log((l) => l.info(`[fetch] resized semaphore to ${newConcurrency}`));
            }
            catch (err) {
                LoggedError.isTurtlesAllTheWayDownBaby(err, {
                    source: 'fetch:resize',
                    log: true,
                });
            }
        }
        const newTimeout = cfg.timeout;
        if (newTimeout) {
            this.config.timeout = newTimeout;
        }
        const newDetectBuffer = cfg.fetch_stream_detect_buffer;
        const newBufferMax = cfg.fetch_stream_buffer_max;
        if (newDetectBuffer !== this.streamDetectBuffer) {
            this.streamDetectBuffer = newDetectBuffer;
        }
        if (newBufferMax !== this.streamBufferMax) {
            this.streamBufferMax = newBufferMax;
        }
        this.dedupWriteRequests = cfg.dedup_writerequests;
    }
    [Symbol.dispose]() {
        this.cache.clear();
        this.inflight.clear();
        log((l) => l.info('[fetch] FetchManager disposed'));
    }
    async doGotFetch(url, init) {
        const [, gotOptions] = normalizeRequestInit({
            requestInfo: url,
            requestInit: init,
            defaults: {
                method: 'GET',
                isStream: false,
                retry: { limit: 1 },
                timeout: {
                    ...this.config.timeout,
                },
                throwHttpErrors: false,
                responseType: 'buffer',
            },
        });
        log((l) => l.info(`GOT Fetch: About to read [${url}] using - ${safeSerialize(gotOptions, {
            maxObjectDepth: 4,
            maxPropertyDepth: 20,
        })}`));
        await this.semManager.sem.acquire();
        try {
            const res = await got(url, gotOptions);
            const headersObj = {};
            for (const [k, v] of Object.entries(res.headers || {})) {
                if (Array.isArray(v))
                    headersObj[k] = v.join(',');
                else if (v === undefined)
                    continue;
                else
                    headersObj[k] = String(v);
            }
            return {
                body: res.rawBody,
                headers: headersObj,
                statusCode: res.statusCode,
            };
        }
        finally {
            this.semManager.sem.release();
        }
    }
    async fetchStream(input, init) {
        await this.loadConfig();
        const [normalizedUrl, options] = normalizeRequestInit({
            requestInfo: input,
            requestInit: init,
            defaults: {
                method: 'GET',
                isStream: true,
                retry: { limit: 1 },
                timeout: {
                    ...this.config.timeout,
                },
            },
        });
        const method = (options.method || 'GET').toUpperCase();
        const cacheKey = `${method}:${normalizedUrl}`;
        const enhanced = await this.#isEnhancedEnabled();
        if (!enhanced) {
            const instrumented = await createInstrumentedSpan({
                spanName: 'fetch.get',
                attributes: {
                    'http.method': 'GET',
                    'http.url': normalizedUrl,
                    'http.enhanced-fetch': false,
                },
            });
            return await instrumented.executeWithContext(async (span) => {
                const domResponse = await this.#doDomFetch(normalizedUrl, options);
                const headersLower = {};
                for (const [k, v] of Object.entries(domResponse.headers || {}))
                    headersLower[k.toLowerCase()] = Array.isArray(v)
                        ? v.join(',')
                        : String(v ?? '');
                const isStreaming = this.streamingStrategy.detectStreamingResponse(headersLower);
                span.setAttribute('http.is_streaming', isStreaming);
                if (!domResponse.body) {
                    throw new Error('No body found in response');
                }
                if (isStreaming) {
                    return this.streamingStrategy.handlePureStreaming(cacheKey, await webStreamToReadable(domResponse.body), headersLower, domResponse.status, span, false);
                }
                const bufferedResult = await this.bufferingStrategy.handleBufferedResponse(cacheKey, await webStreamToReadable(domResponse.body), headersLower, domResponse.status, normalizedUrl, span, false);
                return bufferedResult.response;
            });
        }
        await this.semManager.sem.acquire();
        try {
            const stream = got.stream(normalizedUrl, options);
            const releaseOnce = () => {
                try {
                    this.semManager.sem.release();
                }
                catch { }
            };
            stream.on('end', releaseOnce);
            stream.on('error', releaseOnce);
            return stream;
        }
        catch (err) {
            this.semManager.sem.release();
            throw err;
        }
    }
    #isEnhancedEnabled() {
        return fetchConfig()
            .then((x) => x.enhanced)
            .catch((e) => {
            LoggedError.isTurtlesAllTheWayDownBaby(e, {
                source: 'fetch:enhanced-enabled-fail',
                log: true,
            });
            return false;
        });
    }
    async #doDomFetch(url, normalInit) {
        const domFetch = globalThis.fetch;
        if (typeof domFetch === 'function') {
            const controller = new AbortController();
            const signal = normalInit.signal;
            if (signal) {
                signal.addEventListener('abort', controller.abort);
            }
            normalInit.signal = controller.signal;
            const domReq = domFetch(url, normalInit);
            return normalInit.timeout?.request
                ? withTimeout(domReq, normalInit.timeout.request).then((x) => {
                    if (x.timedOut) {
                        controller.abort();
                        throw new TimeoutError();
                    }
                    return x.value;
                })
                : domReq;
        }
        throw new Error('No fetch implementation found');
    }
    async fetch(input, init) {
        await this.loadConfig();
        const [url, normalInit] = normalizeRequestInit({
            requestInfo: input,
            requestInit: init,
        });
        const method = (normalInit.method || 'GET').toUpperCase();
        const cacheKey = `${method}:${url}`;
        const enhanced = await this.#isEnhancedEnabled();
        if (!enhanced) {
            const instrumented = await createInstrumentedSpan({
                spanName: `fetch.${method}`,
                attributes: {
                    'http.method': method,
                    'http.url': url,
                    'http.enhanced-fetch': false,
                },
            });
            return await instrumented.executeWithContext(async (span) => {
                const domResponse = await this.#doDomFetch(url, normalInit);
                const headersLower = {};
                for (const [k, v] of Object.entries(domResponse.headers || {}))
                    headersLower[k.toLowerCase()] = Array.isArray(v)
                        ? v.join(',')
                        : String(v ?? '');
                const isStreaming = this.streamingStrategy.detectStreamingResponse(headersLower);
                span.setAttribute('http.is_streaming', isStreaming);
                if (!domResponse.body) {
                    throw new Error('No body found in response');
                }
                if (isStreaming) {
                    return this.streamingStrategy.handlePureStreaming(cacheKey, await webStreamToReadable(domResponse.body), headersLower, domResponse.status, span, false);
                }
                const bufferedResult = await this.bufferingStrategy.handleBufferedResponse(cacheKey, await webStreamToReadable(domResponse.body), headersLower, domResponse.status, url, span, false);
                return bufferedResult.response;
            });
        }
        if (method === 'GET') {
            const instrumented = await createInstrumentedSpan({
                spanName: 'fetch.get',
                attributes: {
                    'http.method': 'GET',
                    'http.url': url,
                    'http.enhanced-fetch': true,
                },
            });
            return await instrumented.executeWithContext(async (span) => {
                const memoryCached = await this.cacheStrategies.tryMemoryCache(cacheKey, span);
                if (memoryCached)
                    return memoryCached;
                const redisCached = await this.cacheStrategies.tryRedisCache(cacheKey, span);
                if (redisCached)
                    return redisCached;
                const inflightCached = await this.cacheStrategies.tryInflightDedupe(cacheKey, span);
                if (inflightCached)
                    return inflightCached;
                await this.semManager.sem.acquire();
                let gotStream;
                try {
                    gotStream = got.stream(url, {
                        method: 'GET',
                        headers: normalInit.headers,
                        retry: { limit: 1 },
                        timeout: normalInit.timeout,
                    });
                    const resHead = await new Promise((resolve, reject) => {
                        const ee = gotStream;
                        const onResponse = (res) => {
                            ee.removeListener('response', onResponse);
                            ee.removeListener('error', onError);
                            resolve({
                                statusCode: res.statusCode,
                                headers: res.headers,
                            });
                        };
                        const onError = (err) => {
                            ee.removeListener('response', onResponse);
                            ee.removeListener('error', onError);
                            reject(err);
                        };
                        ee.on('response', onResponse);
                        ee.on('error', onError);
                    });
                    const headersLower = {};
                    for (const [k, v] of Object.entries(resHead.headers || {}))
                        headersLower[k.toLowerCase()] = Array.isArray(v)
                            ? v.join(',')
                            : String(v ?? '');
                    const isStreaming = this.streamingStrategy.detectStreamingResponse(headersLower);
                    span.setAttribute('http.is_streaming', isStreaming);
                    if (isStreaming) {
                        return this.streamingStrategy.handlePureStreaming(cacheKey, gotStream, headersLower, resHead.statusCode ?? 200, span, true);
                    }
                    const bufferedResult = await this.bufferingStrategy.handleBufferedResponse(cacheKey, gotStream, headersLower, resHead.statusCode ?? 200, url, span, true);
                    return bufferedResult.response;
                }
                catch (err) {
                    try {
                        this.semManager.sem.release();
                    }
                    catch (semErr) {
                        LoggedError.isTurtlesAllTheWayDownBaby(semErr, {
                            source: 'fetch:semaphore:release-error',
                            log: true,
                        });
                    }
                    span.setAttribute('http.error', true);
                    LoggedError.isTurtlesAllTheWayDownBaby(err, {
                        source: 'fetch:network-error',
                        log: true,
                    });
                    throw err;
                }
            });
        }
        const instrumented = await createInstrumentedSpan({
            spanName: 'fetch.non_get',
            attributes: {
                'http.method': method,
                'http.url': url,
                'http.enhanced-fetch': true,
            },
        });
        return await instrumented.executeWithContext(async (span) => {
            const v = await this.doGotFetch(url, normalInit);
            span.setAttribute('http.status_code', v.statusCode);
            return makeResponse(v);
        });
    }
}
export const getFetchManager = () => {
    return SingletonProvider.Instance.getRequired(FETCH_MANAGER_SINGLETON_KEY, () => new FetchManager());
};
export const configureFetchManager = (config) => {
    const instance = new FetchManager(config);
    SingletonProvider.Instance.set(FETCH_MANAGER_SINGLETON_KEY, instance);
    return instance;
};
export const resetFetchManager = () => {
    const existing = SingletonProvider.Instance.get(FETCH_MANAGER_SINGLETON_KEY);
    if (existing) {
        existing[Symbol.dispose]();
    }
    SingletonProvider.Instance.delete(FETCH_MANAGER_SINGLETON_KEY);
};
export const serverFetch = async (input, init) => getFetchManager().fetch(input, init);
export const fetchStream = async (input, init) => getFetchManager().fetchStream(input, init);
//# sourceMappingURL=fetch-server.js.map
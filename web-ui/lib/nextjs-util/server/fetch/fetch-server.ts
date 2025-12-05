import got, { Response as GotResponse, OptionsInit, OptionsOfBufferResponseBody } from 'got';
import type { Readable } from 'stream';
import type { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import {
  SemaphoreManager,
  Semaphore,
} from '@/lib/nextjs-util/semaphore-manager';
type Handler = (...args: unknown[]) => void;
import { getRedisClient } from '@/lib/redis-client';
import { makeResponse } from '../response';
import { fetchConfig, fetchConfigSync, FETCH_MANAGER_SINGLETON_KEY } from './fetch-config';
import { LoggedError } from '@/lib/react-util';
import { createInstrumentedSpan } from '../utils';
import { log } from '@/lib/logger';
import { SingletonProvider } from '@/lib/typescript/singleton-provider/provider';
import { CacheStrategies } from './cache-strategies';
import { StreamingStrategy } from './streaming-strategy';
import { BufferingStrategy } from './buffering-strategy';
import type { CachedValue, RequestInfo, RequestInit, ServerFetchManager } from './fetch-types';

const DEFAULT_CONCURRENCY = 8;
const DEFAULT_CACHE_SIZE = 500;
const DEFAULT_STREAM_DETECT_BUFFER = 4 * 1024;
const DEFAULT_STREAM_BUFFER_MAX = 64 * 1024;
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_REQUEST_TIMEOUT = 60 * 1000; // 60 seconds

/**
 * Configuration options for FetchManager
 */
export interface FetchManagerConfig {
  /** Initial concurrency limit for fetch requests */
  concurrency: number;
  /** Maximum number of entries in the memory cache */
  cacheSize: number;
  /** Bytes to buffer before detecting if response is a stream */
  streamDetectBuffer: number;
  /** Max bytes to buffer before forcing stream mode */
  streamBufferMax: number;
  /** Maximum response size in bytes (default: 10MB) */
  maxResponseSize: number;
  /** Request timeout in milliseconds (default: 30s) */
  requestTimeout: number;
}

const DEFAULT_CONFIG: FetchManagerConfig = {
  concurrency: DEFAULT_CONCURRENCY,
  cacheSize: DEFAULT_CACHE_SIZE,
  streamDetectBuffer: DEFAULT_STREAM_DETECT_BUFFER,
  streamBufferMax: DEFAULT_STREAM_BUFFER_MAX,
  maxResponseSize: DEFAULT_MAX_RESPONSE_SIZE,
  requestTimeout: DEFAULT_REQUEST_TIMEOUT,
};



const mergeHeaders = (
  target: Record<string, string | string[] | undefined>,
  source: Headers | Record<string, string | string[]> | [string, string | string[]][] | undefined
) => {
  if (!source) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMatchingKey = (obj: Record<string, any>, key: string) => {
    const lower = key.toLowerCase();
    return Object.keys(obj).find((k) => k.toLowerCase() === lower) || key;
  };

  const processEntry = (key: string, value: string | string[] | undefined | null) => {
    if (value === undefined || value === null) return;

    const matchingKey = getMatchingKey(target, key);
    const existing = target[matchingKey];

    if (matchingKey.toLowerCase() === 'user-agent') {
      const existingStr = Array.isArray(existing)
        ? existing.join(' ')
        : (existing as string | undefined);
      const newStr = Array.isArray(value) ? value.join(' ') : value;
      if (existingStr) {
        target[matchingKey] = `${existingStr} ${newStr}`;
      } else {
        target[matchingKey] = newStr;
      }
      return;
    }

    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        if (Array.isArray(value)) {
          target[matchingKey] = [...existing, ...value];
        } else {
          target[matchingKey] = [...existing, value];
        }
      } else {
        // Existing is string
        if (Array.isArray(value)) {
          target[matchingKey] = [existing as string, ...value];
        } else {
          // Both strings -> convert to array
          target[matchingKey] = [existing as string, value];
        }
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
  requestInit,
  defaults,
  overrides,
}: {
  requestInfo: RequestInfo;
  requestInit: RequestInit | undefined;
  defaults?: Partial<OptionsInit>;
  overrides?: Partial<OptionsInit>;
}): [string, OptionsInit] => {
  let url: string;
  let init: RequestInit = requestInit || {};

  if (!requestInfo) {
    throw new Error('Invalid requestInfo');
  }

  if (typeof requestInfo === 'string') {
    url = requestInfo;
  } else if (requestInfo instanceof URL) {
    url = requestInfo.toString();
  } else if ('url' in requestInfo) {
    url = requestInfo.url;
    init = { ...requestInfo, ...init };
  } else {
    throw new Error('Invalid requestInfo');
  }

  const options: OptionsInit = {
    method: 'GET',
    ...defaults,
    ...init,
    ...overrides,
  } as OptionsInit;

  // Handle body: null -> undefined
  if (options.body === null) {
    options.body = undefined;
  }

  const headers: Record<string, string | string[] | undefined> = {};

  if (defaults?.headers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mergeHeaders(headers, defaults.headers as any);
  }

  if (init.headers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mergeHeaders(headers, init.headers as any);
  }

  if (overrides?.headers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mergeHeaders(headers, overrides.headers as any);
  }

  options.headers = headers;

  const cleanOptions: OptionsInit = {};
  for (const [k, v] of Object.entries(options)) {
    if (v !== undefined && v !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cleanOptions as any)[k] = v;
    }
  }

  return [url, cleanOptions];
};



export class FetchManager implements ServerFetchManager {
  private cache: LRUCache<string, Promise<CachedValue>>;
  private inflight = new Map<string, Promise<CachedValue>>();
  private semManager: SemaphoreManager;
  private lastObservedConcurrency: number;
  private streamDetectBuffer: number;
  private streamBufferMax: number;
  private config: FetchManagerConfig;

  // Strategy instances
  private cacheStrategies: CacheStrategies;
  private streamingStrategy: StreamingStrategy;
  private bufferingStrategy: BufferingStrategy;

  // Lazy refresh state (AutoRefreshFeatureFlag pattern)
  // private _configRefreshAt: number = 0;
  private _pendingConfigRefresh: Promise<void> | null = null;

  // Dedup options
  private dedupWriteRequests: boolean = true;

  constructor(config: Partial<FetchManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize cache
    this.cache = new LRUCache({
      max: this.config.cacheSize,
      updateAgeOnGet: true, // LRU behavior
    });

    // Initialize semaphore
    let initialConcurrency = this.config.concurrency;
    try {
      const cfg = fetchConfigSync();
      initialConcurrency = cfg.fetch_concurrency ?? this.config.concurrency;
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        source: 'fetch-manager:init',
        log: true,
      });
    }

    this.lastObservedConcurrency = initialConcurrency;
    const sem = new Semaphore(initialConcurrency);
    this.semManager = new SemaphoreManager(sem);

    // Initialize stream configuration
    this.streamDetectBuffer = this.config.streamDetectBuffer;
    this.streamBufferMax = this.config.streamBufferMax;

    // Initialize strategy instances with dependency injection
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
        streamMaxChunks: 100, // Will be overridden by fetchConfig
        streamMaxTotalBytes: 10 * 1024 * 1024, // Will be overridden by fetchConfig
      },
      cacheStreamToRedis: this.cacheStrategies.cacheStreamToRedis.bind(
        this.cacheStrategies,
      ),
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
        cacheTtl: 300, // Will be overridden by fetchConfig
        redisEnabled: true,
      },
      cache: this.cache,
      cacheStreamToRedis: this.cacheStrategies.cacheStreamToRedis.bind(
        this.cacheStrategies,
      ),
      getRedisClient,
      fetchConfig: fetchConfigSync,
      releaseSemaphore: () => this.semManager.sem.release(),
    });
  }
  /**
   * Lazy refresh of configuration (AutoRefreshFeatureFlag pattern).
   * Called on each fetch() to check if config needs refreshing.
   * Triggers async refresh if stale, returns immediately.
   */
  private async refreshConfigIfStale(): Promise<void> {
    // Really all the "refresh" does is validate flags have performed an initial
    // load, so OK to call frequently.  Deduplication occurs at the flag level
    // within the config manager.
    if (!this._pendingConfigRefresh) {
      this._pendingConfigRefresh = this.loadConfig()
        .catch((err) => {
          LoggedError.isTurtlesAllTheWayDownBaby(err, {
            source: 'fetch:config-refresh',
            log: true,
          });
        })
        .finally(() => {
          this._pendingConfigRefresh = null;
        });
    }
    await this._pendingConfigRefresh;
  }

  /**
   * Loads configuration from fetchConfigSync and updates internal state.
   * Only updates if values have changed to minimize overhead.
   */
  private async loadConfig(): Promise<void> {
    const cfg = await fetchConfig();

    // Update concurrency if changed
    const newConcurrency = cfg.fetch_concurrency ?? DEFAULT_CONCURRENCY;
    if (newConcurrency !== this.lastObservedConcurrency) {
      try {
        this.semManager.resize(newConcurrency);
        this.lastObservedConcurrency = newConcurrency;
        log((l) => l.info(`[fetch] resized semaphore to ${newConcurrency}`));
      } catch (err) {
        LoggedError.isTurtlesAllTheWayDownBaby(err, {
          source: 'fetch:resize',
          log: true,
        });
      }
    }

    // Update stream configuration if changed
    const newDetectBuffer = cfg.fetch_stream_detect_buffer;
    const newBufferMax = cfg.fetch_stream_buffer_max;

    if (newDetectBuffer !== this.streamDetectBuffer) {
      this.streamDetectBuffer = newDetectBuffer;
    }

    if (newBufferMax !== this.streamBufferMax) {
      this.streamBufferMax = newBufferMax;
    }

    // Simple overwrite for dedupe write flag - no in-flight impact
    this.dedupWriteRequests = cfg.dedup_writerequests;
  }

  [Symbol.dispose](): void {
    this.cache.clear();
    this.inflight.clear();
    log((l) => l.info('[fetch] FetchManager disposed'));
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
      }
    });
    log((l) => l.info(`GOT Fetch: About to read [${url}] using - ${JSON.stringify(gotOptions)}`));
    await this.semManager.sem.acquire();
    try {
      // Normalize timeout to object format for got
      const timeoutVal = gotOptions.timeout;
      let requestTimeout = this.config.requestTimeout;
      if (typeof timeoutVal === 'number') {
        requestTimeout = timeoutVal;
      } else if (timeoutVal && typeof timeoutVal === 'object' && !Array.isArray(timeoutVal)) {
        // Cast to any to access potential 'request' property safely
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = timeoutVal as any;
        requestTimeout = t.request ?? requestTimeout;
      }

      const safeOptions = {
        ...gotOptions,
        timeout: {
          request: requestTimeout
        }
      };

      const res: GotResponse<Buffer> = await got(
        url,
        safeOptions as unknown as OptionsOfBufferResponseBody,
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

  /**
   * Direct streaming fetch without caching
   */
  async fetchStream(input: RequestInfo, init?: RequestInit) {
    const [normalizedUrl, options] = normalizeRequestInit({
      requestInfo: input,
      requestInit: init,
      defaults: {
        method: 'GET',
        isStream: true as const,
        retry: { limit: 1 },
      }
    });
    await this.semManager.sem.acquire();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = got.stream(normalizedUrl, options as any);
      const releaseOnce = () => {
        try {
          this.semManager.sem.release();
        } catch { }
      };
      stream.on('end', releaseOnce);
      stream.on('error', releaseOnce);
      return stream;
    } catch (err) {
      this.semManager.sem.release();
      throw err;
    }
  }

  /**
   * Enhanced fetch implementation with multi-layer caching and streaming support.
   *
   * See main JSDoc on exported `fetch` function for full documentation.
   */
  async fetch(input: RequestInfo, init?: RequestInit) {
    const [url, normalInit] = normalizeRequestInit({
      requestInfo: input,
      requestInit: init,
    });
    // Lazy refresh: check if config is stale and trigger async refresh
    await this.refreshConfigIfStale();

    try {
      const cfg = fetchConfigSync();
      if (!cfg.enhanced) {
        const domFetch = globalThis.fetch;
        if (typeof domFetch === 'function') {
          return domFetch(
            input,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            init as any,
          );
        }
      }
    } catch (e) {
      /* continue with enhanced */
      LoggedError.isTurtlesAllTheWayDownBaby(e, {
        source: 'fetch:config-sync-fail',
        log: true,
      });
    }
    const method = (normalInit.method || 'GET').toUpperCase();
    if (method === 'GET') {
      const cacheKey = `${method}:${url}`;
      const instrumented = await createInstrumentedSpan({
        spanName: 'fetch.get',
        attributes: { 'http.method': 'GET', 'http.url': url },
      });
      return await instrumented.executeWithContext(async (span) => {
        // Try memory cache (L1)
        const memoryCached = await this.cacheStrategies.tryMemoryCache(
          cacheKey,
          span,
        );
        if (memoryCached) return memoryCached;

        // Try Redis cache (L2) - buffered and stream replay
        const redisCached = await this.cacheStrategies.tryRedisCache(
          cacheKey,
          span,
        );
        if (redisCached) return redisCached;

        // Try inflight deduplication
        const inflightCached = await this.cacheStrategies.tryInflightDedupe(
          cacheKey,
          span,
        );
        if (inflightCached) return inflightCached;

        await this.semManager.sem.acquire();
        let gotStream: Readable;
        try {
          const timeoutVal = normalInit.timeout;
          let requestTimeout = this.config.requestTimeout;
          if (typeof timeoutVal === 'number') {
            requestTimeout = timeoutVal;
          } else if (timeoutVal && typeof timeoutVal === 'object') {
            requestTimeout = timeoutVal.request ?? requestTimeout;
          }

          gotStream = got.stream(url, {
            method: 'GET',
            headers: normalInit.headers,
            retry: { limit: 1 },
            timeout: {
              request: requestTimeout,
            },
          });

          const resHead: {
            statusCode?: number;
            headers?: Record<string, string | string[]>;
          } = await new Promise((resolve, reject) => {
            const ee = gotStream as unknown as EventEmitter;
            const onResponse = (res: IncomingMessage) => {
              ee.removeListener('response', onResponse as Handler);
              ee.removeListener('error', onError as Handler);
              resolve({
                statusCode: res.statusCode,
                headers: res.headers as Record<string, string | string[]>,
              });
            };
            const onError = (err: Error) => {
              ee.removeListener('response', onResponse as Handler);
              ee.removeListener('error', onError as Handler);
              reject(err);
            };
            ee.on('response', onResponse as Handler);
            ee.on('error', onError as Handler);
          });

          const headersLower: Record<string, string> = {};
          for (const [k, v] of Object.entries(resHead.headers || {}))
            headersLower[k.toLowerCase()] = Array.isArray(v)
              ? v.join(',')
              : String(v ?? '');

          const isStreaming =
            this.streamingStrategy.detectStreamingResponse(headersLower);

          span.setAttribute('http.is_streaming', isStreaming);

          if (isStreaming) {
            // Use streaming strategy for pure streaming response
            return this.streamingStrategy.handlePureStreaming(
              cacheKey,
              gotStream,
              headersLower,
              resHead.statusCode ?? 200,
              span,
            );
          }

          // Use buffering strategy for non-streaming responses
          const bufferedResult =
            await this.bufferingStrategy.handleBufferedResponse(
              cacheKey,
              gotStream,
              headersLower,
              resHead.statusCode ?? 200,
              url,
              span,
            );
          return bufferedResult.response;
        } catch (err) {
          try {
            this.semManager.sem.release();
          } catch (semErr) {
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

    // non-GET: do a normal got fetch limited by semaphore
    const instrumented = await createInstrumentedSpan({
      spanName: 'fetch.non_get',
      attributes: { 'http.method': method, 'http.url': url },
    });
    return await instrumented.executeWithContext(async (span) => {
      const v = await this.doGotFetch(url, normalInit as unknown as RequestInit);
      span.setAttribute('http.status_code', v.statusCode);
      return makeResponse(v);
    });
  }
}

export const getFetchManager = (): FetchManager => {
  return SingletonProvider.Instance.getRequired<FetchManager>(
    FETCH_MANAGER_SINGLETON_KEY,
    () => new FetchManager(),
  );
};

export const configureFetchManager = (
  config: Partial<FetchManagerConfig>,
): FetchManager => {
  const instance = new FetchManager(config);
  SingletonProvider.Instance.set(FETCH_MANAGER_SINGLETON_KEY, instance);
  return instance;
};

export const resetFetchManager = (): void => {
  const existing = SingletonProvider.Instance.get<FetchManager>(
    FETCH_MANAGER_SINGLETON_KEY,
  );
  if (existing) {
    existing[Symbol.dispose]();
  }
  SingletonProvider.Instance.delete(FETCH_MANAGER_SINGLETON_KEY);
};

export const serverFetch = async (input: RequestInfo, init?: RequestInit) => {
  return getFetchManager().fetch(input, init);
};

export const fetchStream = async (input: RequestInfo, init?: RequestInit) => {
  return getFetchManager().fetchStream(input, init);
};

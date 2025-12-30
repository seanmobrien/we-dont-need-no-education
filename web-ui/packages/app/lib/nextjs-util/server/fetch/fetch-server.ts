import got, {
  Response as GotResponse,
  OptionsInit,
  OptionsOfBufferResponseBody,
} from 'got';
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
import { makeResponse, webStreamToReadable } from '../response';
import {
  fetchConfig,
  fetchConfigSync,
  FETCH_MANAGER_SINGLETON_KEY,
} from './fetch-config';
import { LoggedError } from '@/lib/react-util';
import { createInstrumentedSpan } from '../utils';
import { log, safeSerialize } from '@compliance-theater/logger';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { CacheStrategies } from './cache-strategies';
import { StreamingStrategy } from './streaming-strategy';
import { BufferingStrategy } from './buffering-strategy';
import type {
  CachedValue,
  RequestInfo,
  RequestInit,
  ServerFetchManager,
} from './fetch-types';
import { EnhancedFetchConfig } from '@/lib/site-util/feature-flags/types';
import { AllFeatureFlagsDefault } from '@/lib/site-util/feature-flags/known-feature-defaults';
import { withTimeout } from '../../with-timeout';
import { TimeoutError } from '@/lib/react-util/errors/timeout-error';

const DEFAULT_CONCURRENCY = 8;
const DEFAULT_CACHE_SIZE = 500;
const DEFAULT_STREAM_DETECT_BUFFER = 4 * 1024;
const DEFAULT_STREAM_BUFFER_MAX = 64 * 1024;
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

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
  /**
   * Timeouts for different stages of the connection
   */
  timeout: EnhancedFetchConfig['timeout'];
}

const DEFAULT_CONFIG: FetchManagerConfig = {
  concurrency: DEFAULT_CONCURRENCY,
  cacheSize: DEFAULT_CACHE_SIZE,
  streamDetectBuffer: DEFAULT_STREAM_DETECT_BUFFER,
  streamBufferMax: DEFAULT_STREAM_BUFFER_MAX,
  maxResponseSize: DEFAULT_MAX_RESPONSE_SIZE,
  timeout: AllFeatureFlagsDefault.models_fetch_enhanced.timeout,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMatchingKey = (obj: Record<string, any>, key: string) => {
    const lower = key.toLowerCase();
    return Object.keys(obj).find((k) => k.toLowerCase() === lower) || key;
  };

  const processEntry = (
    key: string,
    value: string | string[] | undefined | null,
  ) => {
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

type RequestInitWithTimeout = Omit<RequestInit, 'timeout'> & {
  timeout?: number | Partial<EnhancedFetchConfig['timeout']>;
};

export const normalizeRequestInit = ({
  requestInfo,
  requestInit: { timeout: initTimeout, ...requestInit } = {},
  defaults: { timeout: defaultTimeouts, ...defaults } = {},
}: {
  requestInfo: RequestInfo;
  requestInit?: RequestInitWithTimeout;
  defaults?: Partial<OptionsInit>;
}): [string, OptionsInit] => {
  let url: string;
  let init: Omit<RequestInitWithTimeout, 'timeout'> & {
    timeout?: Partial<EnhancedFetchConfig['timeout']>;
  } = {
    ...requestInit,
  };

  // Handle URLSearchParams body
  if (init.body instanceof URLSearchParams) {
    init.body = init.body.toString();
    if (!init.headers) {
      init.headers = {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      };
    } else if (Array.isArray(init.headers)) {
      init.headers.push([
        'Content-Type',
        'application/x-www-form-urlencoded;charset=UTF-8',
      ]);
    } else if (init.headers instanceof Headers) {
      if (!init.headers.has('Content-Type')) {
        init.headers.set(
          'Content-Type',
          'application/x-www-form-urlencoded;charset=UTF-8',
        );
      }
    } else {
      // Record<string, string | string[]>
      // Check if Content-Type exists case-insensitively
      const hasContentType = Object.keys(init.headers).some(
        (k) => k.toLowerCase() === 'content-type',
      );
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
  } else if (requestInfo instanceof URL) {
    url = requestInfo.toString();
  } else if ('url' in requestInfo) {
    if ('timeout' in requestInfo && !!requestInfo.timeout) {
      if (typeof requestInfo.timeout === 'number') {
        init.timeout = {
          connect: requestInfo.timeout,
          socket: requestInfo.timeout,
          ...init.timeout,
        };
      } else if (typeof requestInfo.timeout === 'object') {
        init.timeout = {
          ...requestInfo.timeout,
          ...init.timeout,
        };
      } else {
        log((l) => l.warn(`Unrecognized timeout type: ${requestInfo.timeout}`));
      }
    }
    // Timeout has been normalized as timeout under init.timeout,
    // and url extracted, so we want to eliminate then from the request.
    url = requestInfo.url;
    init = {
      ...{
        ...requestInfo,
        timeout: undefined,
        url: undefined,
      },
      ...init,
    };
  } else {
    throw new Error('Invalid requestInfo');
  }
  const options: OptionsInit = {
    method: 'GET',
    ...defaults,
    ...init,
    timeout: {
      ...defaultTimeouts,
      ...(init.timeout ?? {}),
    },
  } as OptionsInit;

  const headers: Record<string, string | string[] | undefined> = {};

  if (defaults?.headers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mergeHeaders(headers, defaults.headers as any);
  }

  if (init.headers) {
    mergeHeaders(headers, init.headers);
  }
  options.headers = headers;

  // Strip out undefined / null / 0 values
  const cleanOptions: OptionsInit = {};
  for (const [k, v] of Object.entries(options)) {
    const key = k as keyof OptionsInit;
    if (!!v) {
      (cleanOptions as Record<typeof key, OptionsInit[keyof OptionsInit]>)[
        key
      ] = v;
    }
  }

  // If timeout values in init are explicitly null/empty/0, then they will override defaults.
  if (cleanOptions.timeout && init.timeout) {
    const theTimeout = cleanOptions.timeout;
    const initTimeout = init.timeout;
    Object.entries(initTimeout).forEach(([k, v]) => {
      if (!v) {
        delete theTimeout[k as keyof EnhancedFetchConfig['timeout']];
      }
    });
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

    // Update timeout always
    const newTimeout = cfg.timeout;
    if (newTimeout) {
      this.config.timeout = newTimeout;
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
        timeout: {
          ...this.config.timeout,
        },
        throwHttpErrors: false,
        responseType: 'buffer',
      },
    });
    log((l) =>
      l.info(
        `GOT Fetch: About to read [${url}] using - ${safeSerialize(gotOptions, {
          maxObjectDepth: 4,
          maxPropertyDepth: 20,
        })}`,
      ),
    );
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

  /**
   * Direct streaming fetch without caching
   */
  async fetchStream(input: RequestInfo, init?: RequestInitWithTimeout) {
    await this.loadConfig();
    const [normalizedUrl, options] = normalizeRequestInit({
      requestInfo: input,
      requestInit: init,
      defaults: {
        method: 'GET',
        isStream: true as const,
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
        const headersLower: Record<string, string> = {};
        for (const [k, v] of Object.entries(domResponse.headers || {}))
          headersLower[k.toLowerCase()] = Array.isArray(v)
            ? v.join(',')
            : String(v ?? '');

        const isStreaming =
          this.streamingStrategy.detectStreamingResponse(headersLower);

        span.setAttribute('http.is_streaming', isStreaming);
        if (!domResponse.body) {
          throw new Error('No body found in response');
        }
        if (isStreaming) {
          // Use streaming strategy for pure streaming response
          return this.streamingStrategy.handlePureStreaming(
            cacheKey,
            await webStreamToReadable(domResponse.body),
            headersLower,
            domResponse.status,
            span,
            false,
          );
        }
        // Use buffering strategy for non-streaming responses
        const bufferedResult =
          await this.bufferingStrategy.handleBufferedResponse(
            cacheKey,
            await webStreamToReadable(domResponse.body),
            headersLower,
            domResponse.status,
            normalizedUrl,
            span,
            false,
          );
        return bufferedResult.response;
      });
    }
    // otherwise, do got stream
    await this.semManager.sem.acquire();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = got.stream(normalizedUrl, options as any);
      const releaseOnce = () => {
        try {
          this.semManager.sem.release();
        } catch {}
      };
      stream.on('end', releaseOnce);
      stream.on('error', releaseOnce);
      return stream;
    } catch (err) {
      this.semManager.sem.release();
      throw err;
    }
  }

  #isEnhancedEnabled(): Promise<boolean> {
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
  async #doDomFetch(url: string, normalInit: OptionsInit) {
    const domFetch = globalThis.fetch;
    if (typeof domFetch === 'function') {
      const controller = new AbortController();
      // If we were provided a signal then forward it to the controller
      const signal = normalInit.signal;
      if (signal) {
        signal.addEventListener('abort', controller.abort);
      }
      normalInit.signal = controller.signal;
      const domReq = domFetch(
        url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        normalInit as any,
      );
      // the only timeout we handle here is request timeout
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

  /**
   * Enhanced fetch implementation with multi-layer caching and streaming support.
   *
   * See main JSDoc on exported `fetch` function for full documentation.
   */
  async fetch(input: RequestInfo, init?: RequestInitWithTimeout) {
    await this.loadConfig();
    const [url, normalInit] = normalizeRequestInit({
      requestInfo: input,
      requestInit: init,
    });
    const method = (normalInit.method || 'GET').toUpperCase();
    const cacheKey = `${method}:${url}`;
    const enhanced = await this.#isEnhancedEnabled();
    if (!enhanced) {
      // handle as traditional fetch
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
        const headersLower: Record<string, string> = {};
        for (const [k, v] of Object.entries(domResponse.headers || {}))
          headersLower[k.toLowerCase()] = Array.isArray(v)
            ? v.join(',')
            : String(v ?? '');

        const isStreaming =
          this.streamingStrategy.detectStreamingResponse(headersLower);

        span.setAttribute('http.is_streaming', isStreaming);
        if (!domResponse.body) {
          throw new Error('No body found in response');
        }
        if (isStreaming) {
          // Use streaming strategy for pure streaming response
          return this.streamingStrategy.handlePureStreaming(
            cacheKey,
            await webStreamToReadable(domResponse.body),
            headersLower,
            domResponse.status,
            span,
            false,
          );
        }
        // Use buffering strategy for non-streaming responses
        const bufferedResult =
          await this.bufferingStrategy.handleBufferedResponse(
            cacheKey,
            await webStreamToReadable(domResponse.body),
            headersLower,
            domResponse.status,
            url,
            span,
            false,
          );
        return bufferedResult.response;
      });
    }
    // otherwise, handle as enhanced fetch
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
          gotStream = got.stream(url, {
            method: 'GET',
            headers: normalInit.headers,
            retry: { limit: 1 },
            timeout: normalInit.timeout,
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
              true,
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
              true,
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
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.enhanced-fetch': true,
      },
    });
    return await instrumented.executeWithContext(async (span) => {
      const v = await this.doGotFetch(
        url,
        normalInit as unknown as RequestInit,
      );
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

export const serverFetch = async (
  input: RequestInfo,
  init?: RequestInitWithTimeout,
) => getFetchManager().fetch(input, init);

export const fetchStream = async (
  input: RequestInfo,
  init?: RequestInitWithTimeout,
) => getFetchManager().fetchStream(input, init);

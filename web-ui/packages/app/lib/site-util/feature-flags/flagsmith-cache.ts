import {
  AnalyticsProcessor,
  type AnalyticsProcessorOptions,
  type DefaultFlag,
  Flags,
  type FlagsmithCache,
} from 'flagsmith-nodejs';
import { LRUCache } from 'lru-cache';
import { getRedisClient } from '@/lib/redis-client';
import { LoggedError, log } from '@compliance-theater/logger';
import type { LruCacheConfig, RedisCacheConfig } from '@/lib/react-util/types';

type Flag = Flags['flags'][string];

export type FlagsmithCacheOptions = {
  lru?: LruCacheConfig;
  redis?: RedisCacheConfig;
  defaultFlagHandler?: (featureName: string) => DefaultFlag;
};

const DEFAULT_LRU_OPTIONS: Required<LruCacheConfig> = {
  max: 20,
  ttl: 1000 * 60 * 20, // 20 minutes
};

const DEFAULT_REDIS_OPTIONS: Required<RedisCacheConfig> = {
  ttl: 60 * 60, // 1 hour
  keyPrefix: 'flagsmith',
};

export class FlagsmithRedisCache implements FlagsmithCache {
  #lru: LRUCache<string, Flags>;
  #redisOptions: Required<RedisCacheConfig>;
  #defaultFlagHandler: ((featureName: string) => DefaultFlag) | undefined;

  constructor(options: FlagsmithCacheOptions = {}) {
    this.#lru = new LRUCache<string, Flags>({
      max: options.lru?.max ?? DEFAULT_LRU_OPTIONS.max,
      ttl: options.lru?.ttl ? options.lru.ttl * 1000 : DEFAULT_LRU_OPTIONS.ttl, // lru-cache expects ms
    });

    this.#redisOptions = {
      ttl: options.redis?.ttl ?? DEFAULT_REDIS_OPTIONS.ttl,
      keyPrefix: options.redis?.keyPrefix ?? DEFAULT_REDIS_OPTIONS.keyPrefix,
    };

    this.#defaultFlagHandler = options.defaultFlagHandler;
  }

  #getRedisKey(key: string): string {
    return `${this.#redisOptions.keyPrefix}:${key}`;
  }

  async get(key: string): Promise<Flags | undefined> {
    const createNormalizedResult = (data: unknown): Flags | undefined => {
      if (!data) {
        return undefined;
      }
      let normalData: Flags;
      if (typeof data === 'string') {
        return createNormalizedResult(JSON.parse(data));
      }
      if (typeof data !== 'object') {
        log((l) =>
          l.warn(
            `FlagsmithRedisCache::get - Unexpected data type from cache: ${typeof data}`
          )
        );
        return undefined;
      }
      if (data instanceof Flags) {
        normalData = data;
      } else {
        if ('flags' in data && typeof data.flags === 'object') {
          normalData = new Flags(data as { flags: Record<string, Flag> });
        } else {
          normalData = new Flags({ flags: data as Record<string, Flag> });
        }
      }
      if (this.#defaultFlagHandler) {
        normalData.defaultFlagHandler = this.#defaultFlagHandler;
      }
      // Ensure analyticsProcessor is properly instantiated
      if (normalData.analyticsProcessor !== undefined) {
        if (
          typeof normalData.analyticsProcessor.trackFeature !== 'function' ||
          typeof normalData.analyticsProcessor.flush !== 'function'
        ) {
          normalData.analyticsProcessor = new AnalyticsProcessor(
            normalData.analyticsProcessor as unknown as AnalyticsProcessorOptions
          );
        }
      }
      return normalData;
    };
    try {
      // 1. Try L1 Cache (LRU)
      const cachedValue = this.#lru.get(key);
      if (cachedValue) {
        return createNormalizedResult(cachedValue);
      }

      // 2. Try L2 Cache (Redis)
      const redisClient = await getRedisClient();
      const redisKey = this.#getRedisKey(key);
      const redisValue = await redisClient.get(redisKey);

      if (redisValue) {
        const flags = createNormalizedResult(JSON.parse(redisValue));

        // Populate L1 cache on L2 hit
        this.#lru.set(key, flags);

        return flags;
      }
    } catch (error) {
      // Log error but don't fail, fallback to fetching from source (handled by Flagsmith SDK)
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'FlagsmithRedisCache::get',
        log: true,
      });
    }

    return undefined;
  }

  async set(key: string, value: Flags | null | undefined): Promise<void> {
    if (!value) {
      return;
    }

    try {
      // 1. Set L1 Cache
      this.#lru.set(key, value);

      // 2. Set L2 Cache
      const redisClient = await getRedisClient();
      const redisKey = this.#getRedisKey(key);

      // Flagsmith SDK might pass null/undefined, although we guard above.
      // The Flags object should be serializable.
      await redisClient.set(redisKey, JSON.stringify(value), {
        EX: this.#redisOptions.ttl,
      });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        source: 'FlagsmithRedisCache::set',
        log: true,
      });
    }
  }

  has(key: string): boolean | Promise<boolean> {
    // FlagsmithCache interface defines `has`.
    // We can just check LRU sync, but strictly for the interface we might need async check for Redis.
    // However, `get` is usually called immediately after `has`.
    // A simple implementation checking LRU first is efficient, but imperfect if only in Redis.
    // Let's implement full check.
    if (this.#lru.has(key)) return true;

    return (async () => {
      try {
        const redisClient = await getRedisClient();
        const exists = await redisClient.exists(this.#getRedisKey(key));
        return exists > 0;
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          source: 'FlagsmithRedisCache::has',
          log: true,
        });
        return false;
      }
    })();
  }
}

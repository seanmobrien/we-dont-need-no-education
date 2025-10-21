import InMemoryCache from './base-cache';
import type { MemoryHealthCheckResponse } from '@/lib/ai/mem0/types/health-check';
import { globalSingleton } from '@/lib/typescript/singleton-provider';
import { getFeatureFlag } from '@/lib/site-util/feature-flags/server';
import { SingletonProvider } from '@/lib/typescript/singleton-provider/provider';

export class MemoryHealthCache extends InMemoryCache<MemoryHealthCheckResponse> {
  constructor(config?: { ttlMs?: number }) {
    super(config);
  }
}

export const getMemoryHealthCache = (): MemoryHealthCache =>
  globalSingleton(
    'memory-health-cache',
    () => new MemoryHealthCache({ ttlMs: 60 * 1000 }),
  );

// Async initializer to configure memory cache TTL from Flagsmith
const MEM_INIT_PROMISE_KEY = Symbol.for(
  '@noeducation/memory-health-cache-init',
);
const getMemInit = (): Promise<void> | undefined =>
  SingletonProvider.Instance.get(MEM_INIT_PROMISE_KEY) as
    | Promise<void>
    | undefined;
const setMemInit = (p: Promise<void>) =>
  SingletonProvider.Instance.set(MEM_INIT_PROMISE_KEY, p as unknown as object);

export const ensureMemoryCacheConfigured = async () => {
  const existing = getMemInit();
  if (existing) return existing;

  const p = (async () => {
    try {
      const ttl = (await getFeatureFlag(
        'health_memory_cache_ttl',
      )) as unknown as number;
      if (typeof ttl === 'number' && ttl > 0) {
        const cache = new MemoryHealthCache({ ttlMs: ttl * 1000 });
        SingletonProvider.Instance.set('memory-health-cache', cache);
      }
    } catch {
      // ignore - use default
    }
  })();
  setMemInit(p);
  await p;
};

export default getMemoryHealthCache;

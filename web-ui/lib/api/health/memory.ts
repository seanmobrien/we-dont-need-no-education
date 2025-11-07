import InMemoryCache from './base-cache';
import type { MemoryHealthCheckResponse } from '@/lib/ai/mem0/types/health-check';
import { globalSingletonAsync } from '@/lib/typescript/singleton-provider';
import { getFeatureFlag } from '@/lib/site-util/feature-flags/server';
import { SingletonProvider } from '@/lib/typescript/singleton-provider/provider';

export class MemoryHealthCache extends InMemoryCache<MemoryHealthCheckResponse> {
  constructor(config?: { ttlMs?: number }) {
    super(config);
  }
}

export const getMemoryHealthCache = (): Promise<MemoryHealthCache> =>
  globalSingletonAsync(
    'memory-health-cache',
    async () => {
      try {
        const ttlFlag = await getFeatureFlag('health_memory_cache_ttl');
        const ttl = Number(ttlFlag);
        if (Number.isFinite(ttl) && ttl > 0) {
          return new MemoryHealthCache({ ttlMs: ttl * 1000 });
        }
      } catch {
        // ignore - use default
      }
      return new MemoryHealthCache({ ttlMs: 60 * 1000 });
    },
    { weakRef: true },
  );

export default getMemoryHealthCache;

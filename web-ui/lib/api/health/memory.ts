import InMemoryCache from './base-cache';
import type { MemoryHealthCheckResponse } from '@/lib/ai/mem0/types/health-check';
import { globalSingletonAsync } from '@/lib/typescript/singleton-provider';
import { getFeatureFlag } from '@/lib/site-util/feature-flags/server';

export class MemoryHealthCache extends InMemoryCache<MemoryHealthCheckResponse> {
  constructor(
    config?: {
      ttlMs?: number;
      errorTtlMs?: number;
      warningTtlMs?: number;
    },
  ) {
    const errorTtlMs = config?.errorTtlMs ?? 10 * 1000; // 10 seconds for errors
    const warningTtlMs = config?.warningTtlMs ?? 30 * 1000; // 30 seconds for warnings
    const okTtlMs = config?.ttlMs ?? 60 * 1000; // 60 seconds for ok status

    super({
      ttlMs: okTtlMs,
      getTtlMs: (value: MemoryHealthCheckResponse) => {
        // Use shorter TTL for error states to allow faster recovery detection
        // but prevent cascading failures during outages
        if (value.status === 'error') {
          return errorTtlMs;
        }
        if (value.status === 'warning') {
          return warningTtlMs;
        }
        return okTtlMs;
      },
    });
  }
}

export const getMemoryHealthCache = (): Promise<MemoryHealthCache> =>
  globalSingletonAsync(
    'memory-health-cache',
    async () => {
      try {
        const ttlFlag = await getFeatureFlag('health_memory_cache_ttl');
        const errorTtlFlag = await getFeatureFlag('health_memory_cache_error_ttl');
        const warningTtlFlag = await getFeatureFlag('health_memory_cache_warning_ttl');
        
        const ttl = Number(ttlFlag);
        const errorTtl = Number(errorTtlFlag);
        const warningTtl = Number(warningTtlFlag);
        
        const config: {
          ttlMs?: number;
          errorTtlMs?: number;
          warningTtlMs?: number;
        } = {};
        
        if (Number.isFinite(ttl) && ttl > 0) {
          config.ttlMs = ttl * 1000;
        }
        if (Number.isFinite(errorTtl) && errorTtl > 0) {
          config.errorTtlMs = errorTtl * 1000;
        }
        if (Number.isFinite(warningTtl) && warningTtl > 0) {
          config.warningTtlMs = warningTtl * 1000;
        }
        
        return new MemoryHealthCache(config);
      } catch {
        // ignore - use defaults
      }
      return new MemoryHealthCache();
    },
    { weakRef: true },
  );

export default getMemoryHealthCache;

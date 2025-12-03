import InMemoryCache from './base-cache';
import type { HealthDetails, HealthStatus, MemoryHealthCheckResponse } from '@/lib/ai/mem0/types/health-check';
import { globalRequiredSingletonAsync } from '@/lib/typescript/singleton-provider';
import {
  wellKnownFlag,
  type AutoRefreshFeatureFlag,
} from '@/lib/site-util/feature-flags/feature-flag-with-refresh';
import type { KnownFeatureType } from '@/lib/site-util/feature-flags/known-feature';

// Helper functions to get auto-refresh feature flags for health cache TTLs
export const getHealthMemoryCacheTtlFlag = () =>
  wellKnownFlag('health_memory_cache_ttl');
export const getHealthMemoryCacheErrorTtlFlag = () =>
  wellKnownFlag('health_memory_cache_error_ttl');
export const getHealthMemoryCacheWarningTtlFlag = () =>
  wellKnownFlag('health_memory_cache_warning_ttl');

export class MemoryHealthCache extends InMemoryCache<MemoryHealthCheckResponse> {
  private ttlFlag?: AutoRefreshFeatureFlag<'health_memory_cache_ttl'>;
  private errorTtlFlag?: AutoRefreshFeatureFlag<'health_memory_cache_error_ttl'>;
  private warningTtlFlag?: AutoRefreshFeatureFlag<'health_memory_cache_warning_ttl'>;

  constructor(config?: {
    ttlMs?: number | AutoRefreshFeatureFlag<'health_memory_cache_ttl'>;
    errorTtlMs?:
    | number
    | AutoRefreshFeatureFlag<'health_memory_cache_error_ttl'>;
    warningTtlMs?:
    | number
    | AutoRefreshFeatureFlag<'health_memory_cache_warning_ttl'>;
  }) {
    // Handle both number and AutoRefreshFeatureFlag for each TTL
    const getTtlValue = (
      value: number | AutoRefreshFeatureFlag<KnownFeatureType> | undefined,
      defaultMs: number,
    ): number => {
      if (value === undefined) return defaultMs;
      if (typeof value === 'number') return value;
      return (value.value as number) * 1000; // Convert seconds to milliseconds
    };

    const defaultErrorTtlMs = 10 * 1000; // 10 seconds for errors
    const defaultWarningTtlMs = 30 * 1000; // 30 seconds for warnings
    const defaultOkTtlMs = 60 * 1000; // 60 seconds for ok status

    const errorTtlMs = getTtlValue(config?.errorTtlMs, defaultErrorTtlMs);
    const warningTtlMs = getTtlValue(config?.warningTtlMs, defaultWarningTtlMs);
    const okTtlMs = getTtlValue(config?.ttlMs, defaultOkTtlMs);

    super({
      ttlMs: okTtlMs,
      getTtlMs: (value: MemoryHealthCheckResponse) => {
        // Use shorter TTL for error states to allow faster recovery detection
        // but prevent cascading failures during outages
        if (value.status === 'error') {
          return this.errorTtlFlag
            ? (this.errorTtlFlag.value as number) * 1000
            : errorTtlMs;
        }
        if (value.status === 'warning') {
          return this.warningTtlFlag
            ? (this.warningTtlFlag.value as number) * 1000
            : warningTtlMs;
        }
        return this.ttlFlag ? (this.ttlFlag.value as number) * 1000 : okTtlMs;
      },
    });
    // Store flag references if provided
    if (config?.ttlMs && typeof config.ttlMs !== 'number') {
      this.ttlFlag =
        config.ttlMs as AutoRefreshFeatureFlag<'health_memory_cache_ttl'>;
    }
    if (config?.errorTtlMs && typeof config.errorTtlMs !== 'number') {
      this.errorTtlFlag =
        config.errorTtlMs as AutoRefreshFeatureFlag<'health_memory_cache_error_ttl'>;
    }
    if (config?.warningTtlMs && typeof config.warningTtlMs !== 'number') {
      this.warningTtlFlag =
        config.warningTtlMs as AutoRefreshFeatureFlag<'health_memory_cache_warning_ttl'>;
    }
  }
}

export const getMemoryHealthCache = (): Promise<MemoryHealthCache> =>
  globalRequiredSingletonAsync(
    'memory-health-cache',
    async () => {
      try {
        // Use auto-refresh feature flags for dynamic TTL updates
        const ttlFlag = await getHealthMemoryCacheTtlFlag();
        const errorTtlFlag = await getHealthMemoryCacheErrorTtlFlag();
        const warningTtlFlag = await getHealthMemoryCacheWarningTtlFlag();

        return new MemoryHealthCache({
          ttlMs: ttlFlag,
          errorTtlMs: errorTtlFlag,
          warningTtlMs: warningTtlFlag,
        });
      } catch {
        // Fallback to defaults if feature flags are unavailable
        return new MemoryHealthCache();
      }
    },
    //{ weakRef: true },
  );


/**
 * A mapping of subsystem names to their health status or status object.
 */
type SubsystemHealthMap = Record<string, { status: HealthStatus } | HealthStatus>

export const getSubsystemHealth = (subsystem: SubsystemHealthMap) => (
  Object.values(subsystem)
    .reduce((acc, x) => {
      const check = typeof x === 'string' ? x : x.status;
      switch (check) {
        case 'healthy':
          return acc;
        case 'warning':
          return acc === 'error' ? acc : check;
        case 'error':
          return check;
        default:
          return acc === 'healthy' ? 'warning' : acc;
      }
    }, 'healthy')
);

/**
 * Determines the overall health status based on the health check details
 */
export const determineHealthStatus = (details: HealthDetails): HealthStatus => {
  // Error if client is not active
  if (!details.client_active) {
    return 'error';
  }

  // Check if any critical services are unavailable
  const criticalServices = [
    details.system_db_available,
    details.vector_store_available,
    details.graph_store_available,
    details.history_store_available,
    details.auth_service.healthy,
  ];

  const unavailableServices = criticalServices.filter((service) => !service);

  // Warning if one or more services are unavailable
  if (unavailableServices.length > 0) {
    return 'warning';
  }

  // Healthy if all services are available
  return 'healthy';
};

export default getMemoryHealthCache;

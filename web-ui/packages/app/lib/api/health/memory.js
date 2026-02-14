import InMemoryCache from './base-cache';
import { globalRequiredSingletonAsync } from '@compliance-theater/typescript/singleton-provider';
import { wellKnownFlag } from '@compliance-theater/feature-flags/feature-flag-with-refresh';
export const getHealthMemoryCacheTtlFlag = () => wellKnownFlag('health_memory_cache_ttl');
export const getHealthMemoryCacheErrorTtlFlag = () => wellKnownFlag('health_memory_cache_error_ttl');
export const getHealthMemoryCacheWarningTtlFlag = () => wellKnownFlag('health_memory_cache_warning_ttl');
export class MemoryHealthCache extends InMemoryCache {
    ttlFlag;
    errorTtlFlag;
    warningTtlFlag;
    constructor(config) {
        const getTtlValue = (value, defaultMs) => {
            if (value === undefined)
                return defaultMs;
            if (typeof value === 'number')
                return value;
            return value.value * 1000;
        };
        const defaultErrorTtlMs = 10 * 1000;
        const defaultWarningTtlMs = 30 * 1000;
        const defaultOkTtlMs = 60 * 1000;
        const errorTtlMs = getTtlValue(config?.errorTtlMs, defaultErrorTtlMs);
        const warningTtlMs = getTtlValue(config?.warningTtlMs, defaultWarningTtlMs);
        const okTtlMs = getTtlValue(config?.ttlMs, defaultOkTtlMs);
        super({
            ttlMs: okTtlMs,
            getTtlMs: (value) => {
                if (value.status === 'error') {
                    return this.errorTtlFlag
                        ? this.errorTtlFlag.value * 1000
                        : errorTtlMs;
                }
                if (value.status === 'warning') {
                    return this.warningTtlFlag
                        ? this.warningTtlFlag.value * 1000
                        : warningTtlMs;
                }
                return this.ttlFlag ? this.ttlFlag.value * 1000 : okTtlMs;
            },
        });
        if (config?.ttlMs && typeof config.ttlMs !== 'number') {
            this.ttlFlag =
                config.ttlMs;
        }
        if (config?.errorTtlMs && typeof config.errorTtlMs !== 'number') {
            this.errorTtlFlag =
                config.errorTtlMs;
        }
        if (config?.warningTtlMs && typeof config.warningTtlMs !== 'number') {
            this.warningTtlFlag =
                config.warningTtlMs;
        }
    }
}
export const getMemoryHealthCache = () => globalRequiredSingletonAsync('memory-health-cache', async () => {
    try {
        const ttlFlag = await getHealthMemoryCacheTtlFlag();
        const errorTtlFlag = await getHealthMemoryCacheErrorTtlFlag();
        const warningTtlFlag = await getHealthMemoryCacheWarningTtlFlag();
        return new MemoryHealthCache({
            ttlMs: ttlFlag,
            errorTtlMs: errorTtlFlag,
            warningTtlMs: warningTtlFlag,
        });
    }
    catch {
        return new MemoryHealthCache();
    }
});
export const getSubsystemHealth = (subsystem) => Object.values(subsystem).reduce((acc, x) => {
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
}, 'healthy');
export const determineHealthStatus = (details) => {
    if (!details.client_active) {
        return 'error';
    }
    const criticalServices = [
        details.system_db_available,
        details.vector_store_available,
        details.graph_store_available,
        details.history_store_available,
        details.auth_service.healthy,
    ];
    const unavailableServices = criticalServices.filter((service) => !service);
    if (unavailableServices.length > 0) {
        return 'warning';
    }
    return 'healthy';
};
export default getMemoryHealthCache;
//# sourceMappingURL=memory.js.map
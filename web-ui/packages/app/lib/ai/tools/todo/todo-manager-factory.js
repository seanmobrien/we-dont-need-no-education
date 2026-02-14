import { log, LoggedError } from '@compliance-theater/logger';
import { wellKnownFlag } from '@compliance-theater/feature-flags/feature-flag-with-refresh';
const normalizeStrategyType = (value) => {
    if (value === 'redis') {
        return 'redis';
    }
    if (value !== 'in-memory') {
        log((l) => l.warn('Invalid storage strategy flag value, falling back to in-memory', {
            value,
        }));
    }
    return 'in-memory';
};
const coerceBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
            return true;
        }
        if (normalized === 'false') {
            return false;
        }
    }
    return undefined;
};
const coerceNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
};
const normalizeConfigObject = (value) => {
    const config = {};
    const ttl = coerceNumber(value.ttl);
    if (ttl !== undefined && ttl > 0) {
        config.ttl = ttl;
    }
    if (typeof value.keyPrefix === 'string' &&
        value.keyPrefix.trim().length > 0) {
        config.keyPrefix = value.keyPrefix;
    }
    const enableFallback = coerceBoolean(value.enableFallback);
    if (enableFallback !== undefined) {
        config.enableFallback = enableFallback;
    }
    return config;
};
const unwrapFlagValue = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }
    if ('value' in value) {
        return value.value;
    }
    return value;
};
const parseStorageConfig = (key, rawValue) => {
    const unwrapped = unwrapFlagValue(rawValue);
    if (!unwrapped) {
        return {};
    }
    if (typeof unwrapped === 'string') {
        try {
            const parsed = JSON.parse(unwrapped);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return normalizeConfigObject(parsed);
            }
            return {};
        }
        catch (error) {
            log((l) => l.warn('Failed to parse storage config JSON from feature flag', {
                key,
                error: error instanceof Error ? error.message : String(error),
            }));
            return {};
        }
    }
    if (typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
        return normalizeConfigObject(unwrapped);
    }
    return {};
};
let LastStrategy = null;
export const resetLastStrategy = () => {
    LastStrategy = null;
};
export const createStorageStrategyFromFlags = async () => {
    const result = {
        fallback: {},
        config: {},
        stale: false,
        strategy: 'in-memory',
    };
    try {
        const strategyFlag = await wellKnownFlag('todo_storage_strategy');
        const strategyValue = normalizeStrategyType(strategyFlag.value);
        result.stale = false;
        if (LastStrategy !== strategyValue) {
            log((l) => l.info(`TodoManager: Storage strategy changed from ${LastStrategy ?? 'starting'} to ${strategyValue}.`));
            result.stale = true;
            LastStrategy = strategyValue;
        }
        if (strategyValue === 'in-memory') {
            return result;
        }
        result.strategy = strategyValue;
        result.config = parseStorageConfig('todo_storage_redis_config', (await wellKnownFlag('todo_storage_redis_config')).value);
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'createTodoManagerFromFeatureFlag',
            message: 'Failed to create TodoManager, using in-memory fallback',
        });
    }
    return result;
};
//# sourceMappingURL=todo-manager-factory.js.map
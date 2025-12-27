import type { StorageStrategyConfig, StorageStrategyType } from './storage';
import { log } from '@repo/lib-logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { wellKnownFlag } from '@/lib/site-util/feature-flags/feature-flag-with-refresh';

type StorageConfigFlagKey =
  | 'todo_storage_in_memory_config'
  | 'todo_storage_redis_config';

const normalizeStrategyType = (value: unknown): StorageStrategyType => {
  if (value === 'redis') {
    return 'redis';
  }

  if (value !== 'in-memory') {
    log((l) =>
      l.warn('Invalid storage strategy flag value, falling back to in-memory', {
        value,
      }),
    );
  }

  return 'in-memory';
};

const coerceBoolean = (value: unknown): boolean | undefined => {
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

const coerceNumber = (value: unknown): number | undefined => {
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

const normalizeConfigObject = (
  value: Record<string, unknown>,
): StorageStrategyConfig => {
  const config: StorageStrategyConfig = {};

  const ttl = coerceNumber(value.ttl);
  if (ttl !== undefined && ttl > 0) {
    config.ttl = ttl;
  }

  if (
    typeof value.keyPrefix === 'string' &&
    value.keyPrefix.trim().length > 0
  ) {
    config.keyPrefix = value.keyPrefix;
  }

  const enableFallback = coerceBoolean(value.enableFallback);
  if (enableFallback !== undefined) {
    config.enableFallback = enableFallback;
  }

  return config;
};

const unwrapFlagValue = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  if ('value' in value) {
    return (value as { value?: unknown }).value;
  }

  return value;
};

const parseStorageConfig = (
  key: StorageConfigFlagKey,
  rawValue: unknown,
): StorageStrategyConfig => {
  const unwrapped = unwrapFlagValue(rawValue);

  if (!unwrapped) {
    return {};
  }

  if (typeof unwrapped === 'string') {
    try {
      const parsed = JSON.parse(unwrapped);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return normalizeConfigObject(parsed as Record<string, unknown>);
      }
      return {};
    } catch (error) {
      log((l) =>
        l.warn('Failed to parse storage config JSON from feature flag', {
          key,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return {};
    }
  }

  if (typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    return normalizeConfigObject(unwrapped as Record<string, unknown>);
  }

  return {};
};

type StorageStrategyConfigResult = {
  fallback: Omit<StorageStrategyConfig, 'fallback'>;
  config: StorageStrategyConfig;
  stale: boolean;
  strategy: StorageStrategyType;
};

let LastStrategy: StorageStrategyType | null = null;

export const resetLastStrategy = () => {
  LastStrategy = null;
};

/**
 * Create a TodoManager instance with storage strategy determined by feature flag.
 *
 * This function reads the `todo_storage_strategy` feature flag along with
 * per-strategy configuration flags to support creating a TodoManager with
 * the appropriate storage backend. It supports:
 * - 'in-memory': Fast, ephemeral storage (default)
 * - 'redis': Persistent, distributed storage with graceful fallback
 *
 * @param userId - Optional user ID for user-specific data segmentation
 * @returns A configured TodoManager instance
 */
export const createStorageStrategyFromFlags =
  async (): Promise<StorageStrategyConfigResult> => {
    const result: StorageStrategyConfigResult = {
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
        log((l) =>
          l.info(
            `TodoManager: Storage strategy changed from ${LastStrategy ?? 'starting'} to ${strategyValue}.`,
          ),
        );
        result.stale = true;
        LastStrategy = strategyValue;
      }
      if (strategyValue === 'in-memory') {
        return result;
      }

      result.strategy = strategyValue;
      result.config = parseStorageConfig(
        'todo_storage_redis_config',
        (await wellKnownFlag('todo_storage_redis_config')).value,
      );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'createTodoManagerFromFeatureFlag',
        message: 'Failed to create TodoManager, using in-memory fallback',
      });
    }
    // Always fall back to in-memory on errors
    return result;
  };

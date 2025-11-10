import { getFeatureFlag } from '@/lib/site-util/feature-flags/server';
import { createStorageStrategy } from './storage';
import { InMemoryStorageStrategy } from './storage';
import { createTodoManager } from './todo-manager';
import type { TodoManager } from './todo-manager';
import type { StorageStrategyType } from './storage';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

/**
 * Create a TodoManager instance with storage strategy determined by feature flag.
 *
 * This function reads the `todo_storage_strategy` feature flag and creates
 * a TodoManager with the appropriate storage backend. It supports:
 * - 'in-memory': Fast, ephemeral storage (default)
 * - 'redis': Persistent, distributed storage with graceful fallback
 *
 * @param userId - Optional user ID for user-specific data segmentation
 * @returns A configured TodoManager instance
 */
export const createTodoManagerFromFeatureFlag = async (
  userId?: string,
): Promise<TodoManager> => {
  try {
    // Get the storage strategy from feature flag
    const strategyType = await getFeatureFlag('todo_storage_strategy');
    const strategyValue =
      typeof strategyType === 'string' ? strategyType : 'in-memory';

    log((l) =>
      l.debug('Creating TodoManager with storage strategy', {
        strategy: strategyValue,
        userId,
      }),
    );

    // Validate strategy type
    if (strategyValue !== 'in-memory' && strategyValue !== 'redis') {
      log((l) =>
        l.warn('Invalid storage strategy, falling back to in-memory', {
          invalid: strategyValue,
        }),
      );
      return createTodoManager(new InMemoryStorageStrategy(), userId);
    }

    // Create storage strategy with fallback enabled for Redis
    const config = {
      enableFallback: strategyValue === 'redis',
    };

    // For Redis, create with in-memory fallback
    const fallbackStrategy =
      strategyValue === 'redis' ? new InMemoryStorageStrategy() : undefined;

    const storage = await createStorageStrategy(
      strategyValue as StorageStrategyType,
      config,
      fallbackStrategy,
    );

    return createTodoManager(storage, userId);
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDown(error, {
      log: true,
      source: 'createTodoManagerFromFeatureFlag',
      message: 'Failed to create TodoManager, using in-memory fallback',
    });

    // Always fall back to in-memory on errors
    return createTodoManager(new InMemoryStorageStrategy(), userId);
  }
};

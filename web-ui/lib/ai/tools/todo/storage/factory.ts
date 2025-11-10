import type {
  TodoStorageStrategy,
  StorageStrategyConfig,
  StorageStrategyType,
} from './types';
import { InMemoryStorageStrategy } from './in-memory-storage';
import { RedisStorageStrategy } from './redis-storage';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

/**
 * Factory function to create storage strategies based on type.
 *
 * @param strategyType - The type of storage strategy to create
 * @param config - Configuration options for the strategy
 * @param fallbackStrategy - Optional fallback strategy if the primary fails
 * @returns A storage strategy instance
 */
export const createStorageStrategy = async (
  strategyType: StorageStrategyType,
  config: StorageStrategyConfig = {},
  fallbackStrategy?: TodoStorageStrategy,
): Promise<TodoStorageStrategy> => {
  try {
    switch (strategyType) {
      case 'in-memory':
        log((l) => l.debug('Creating in-memory storage strategy'));
        return new InMemoryStorageStrategy(config);

      case 'redis':
        log((l) => l.debug('Creating Redis storage strategy'));
        const redisStrategy = new RedisStorageStrategy(config);

        // If fallback is enabled and a fallback strategy is provided, wrap with fallback
        if (config.enableFallback && fallbackStrategy) {
          return createFallbackStrategy(redisStrategy, fallbackStrategy);
        }

        return redisStrategy;

      default:
        throw new Error(`Unknown storage strategy type: ${strategyType}`);
    }
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDown(error, {
      log: true,
      source: 'createStorageStrategy',
    });

    // If we have a fallback, use it
    if (fallbackStrategy) {
      log((l) =>
        l.warn(
          `Failed to create ${strategyType} storage strategy, using fallback`,
        ),
      );
      return fallbackStrategy;
    }

    throw error;
  }
};

/**
 * Creates a storage strategy that falls back to another strategy on errors.
 *
 * @param primary - Primary storage strategy
 * @param fallback - Fallback storage strategy
 * @returns A wrapped storage strategy with fallback behavior
 */
export const createFallbackStrategy = (
  primary: TodoStorageStrategy,
  fallback: TodoStorageStrategy,
): TodoStorageStrategy => {
  const wrapMethod = <T extends unknown[]>(
    methodName: keyof TodoStorageStrategy,
  ) => {
    return async (...args: T) => {
      try {
        const method = primary[methodName] as (...args: T) => Promise<unknown>;
        return await method.apply(primary, args);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDown(error, {
          log: true,
          source: `FallbackStrategy::${String(methodName)}`,
          message: `Primary strategy failed, using fallback`,
        });

        const fallbackMethod = fallback[methodName] as (
          ...args: T
        ) => Promise<unknown>;
        return await fallbackMethod.apply(fallback, args);
      }
    };
  };

  return {
    upsertTodoList: wrapMethod('upsertTodoList'),
    getTodoList: wrapMethod('getTodoList'),
    getTodoLists: wrapMethod('getTodoLists'),
    deleteTodoList: wrapMethod('deleteTodoList'),
    upsertTodo: wrapMethod('upsertTodo'),
    getTodo: wrapMethod('getTodo'),
    getTodos: wrapMethod('getTodos'),
    deleteTodo: wrapMethod('deleteTodo'),
    getTodoToListMapping: wrapMethod('getTodoToListMapping'),
    getCount: wrapMethod('getCount'),
    clearAll: wrapMethod('clearAll'),
  } as TodoStorageStrategy;
};

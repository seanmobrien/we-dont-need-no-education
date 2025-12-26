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
        // Return global in-memory instance
        return InMemoryStorageStrategy.Instance;
      case 'redis':
        // Redis is the bomb!
        log((l) => l.debug('Creating Redis storage strategy'));
        const redisStrategy = new RedisStorageStrategy(config);
        // If fallback is enabled and a fallback strategy is provided, wrap with fallback
        if (config.enableFallback && fallbackStrategy) {
          return createFallbackStrategy(redisStrategy, fallbackStrategy);
        }
        return redisStrategy;
      // And thot's all we know how to do right now...
      default:
        throw new Error(`Unknown storage strategy type: ${strategyType}`);
    }
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
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
  return {
    async upsertTodoList(list) {
      try {
        return await primary.upsertTodoList(list);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::upsertTodoList',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.upsertTodoList(list);
      }
    },

    async getTodoList(listId, options) {
      try {
        return await primary.getTodoList(listId, options);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::getTodoList',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.getTodoList(listId, options);
      }
    },

    async getTodoLists(options) {
      try {
        return await primary.getTodoLists(options);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::getTodoLists',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.getTodoLists(options);
      }
    },

    async deleteTodoList(listId) {
      try {
        return await primary.deleteTodoList(listId);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::deleteTodoList',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.deleteTodoList(listId);
      }
    },

    async upsertTodo(todo, options) {
      try {
        return await primary.upsertTodo(todo, options);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::upsertTodo',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.upsertTodo(todo, options);
      }
    },

    async getTodo(todoId) {
      try {
        return await primary.getTodo(todoId);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::getTodo',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.getTodo(todoId);
      }
    },

    async getTodos(options) {
      try {
        return await primary.getTodos(options);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::getTodos',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.getTodos(options);
      }
    },

    async deleteTodo(todoId) {
      try {
        return await primary.deleteTodo(todoId);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::deleteTodo',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.deleteTodo(todoId);
      }
    },

    async getTodoToListMapping(todoId) {
      try {
        return await primary.getTodoToListMapping(todoId);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::getTodoToListMapping',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.getTodoToListMapping(todoId);
      }
    },

    async getCount(options) {
      try {
        return await primary.getCount(options);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::getCount',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.getCount(options);
      }
    },

    async clearAll(options) {
      try {
        return await primary.clearAll(options);
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'FallbackStrategy::clearAll',
          message: 'Primary strategy failed, using fallback',
        });
        return await fallback.clearAll(options);
      }
    },

    equals(other) {
      return primary.equals(other);
    },
  };
};

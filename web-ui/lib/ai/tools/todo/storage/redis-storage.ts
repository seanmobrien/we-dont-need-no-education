import type { RedisClientType } from '@/lib/redis-client';
import { getRedisClient } from '@/lib/redis-client';
import type { Todo, TodoList } from '../todo-manager';
import type { TodoStorageStrategy, StorageStrategyConfig } from './types';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

const DEFAULT_TTL = 86400; // 24 hours
const DEFAULT_KEY_PREFIX = 'todo';

/**
 * Redis-based storage strategy for todo-lists.
 *
 * Provides persistent, distributed storage for todos with:
 * - User segmentation support
 * - Configurable TTL
 * - Graceful error handling
 * - JSON serialization/deserialization
 */
export class RedisStorageStrategy implements TodoStorageStrategy {
  private config: Required<StorageStrategyConfig>;
  private redisClient: RedisClientType | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: StorageStrategyConfig = {}) {
    this.config = {
      ttl: config.ttl ?? DEFAULT_TTL,
      keyPrefix: config.keyPrefix ?? DEFAULT_KEY_PREFIX,
      enableFallback: config.enableFallback ?? true,
    };
  }

  /**
   * Ensure Redis client is initialized
   */
  private async ensureConnected(): Promise<RedisClientType> {
    if (this.redisClient) {
      return this.redisClient;
    }

    if (!this.initPromise) {
      this.initPromise = this.initializeRedis();
    }

    await this.initPromise;
    if (!this.redisClient) {
      throw new Error('Failed to initialize Redis client');
    }

    return this.redisClient;
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = await getRedisClient();
      log((l) => l.info('Redis storage strategy initialized'));
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::initializeRedis',
      });
      throw error;
    }
  }

  /**
   * Generate Redis key for a todo list
   */
  private getListKey(listId: string, userId?: string): string {
    const userSegment = userId ? `:user:${userId}` : '';
    return `${this.config.keyPrefix}:list${userSegment}:${listId}`;
  }

  /**
   * Generate Redis key for a todo item
   */
  private getTodoKey(todoId: string, userId?: string): string {
    const userSegment = userId ? `:user:${userId}` : '';
    return `${this.config.keyPrefix}:todo${userSegment}:${todoId}`;
  }

  /**
   * Generate Redis key for todo-to-list mapping
   */
  private getTodoToListKey(todoId: string, userId?: string): string {
    const userSegment = userId ? `:user:${userId}` : '';
    return `${this.config.keyPrefix}:mapping${userSegment}:${todoId}`;
  }

  /**
   * Generate Redis key pattern for listing all lists
   */
  private getListPattern(userId?: string): string {
    const userSegment = userId ? `:user:${userId}` : '';
    return `${this.config.keyPrefix}:list${userSegment}:*`;
  }

  /**
   * Generate Redis key pattern for listing all todos
   */
  private getTodoPattern(userId?: string): string {
    const userSegment = userId ? `:user:${userId}` : '';
    return `${this.config.keyPrefix}:todo${userSegment}:*`;
  }

  /**
   * Serialize dates in todo objects for JSON storage
   */
  private serializeTodo(todo: Todo): string {
    return JSON.stringify({
      ...todo,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    });
  }

  /**
   * Deserialize todo from JSON storage
   */
  private deserializeTodo(data: string): Todo {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  }

  /**
   * Serialize todo list for JSON storage
   */
  private serializeTodoList(list: TodoList): string {
    return JSON.stringify({
      ...list,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
      todos: list.todos.map((todo) => ({
        ...todo,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
      })),
    });
  }

  /**
   * Deserialize todo list from JSON storage
   */
  private deserializeTodoList(data: string): TodoList {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      todos: parsed.todos.map((todo: Todo & { createdAt: string; updatedAt: string }) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
      })),
    };
  }

  async upsertTodoList(list: TodoList, userId?: string): Promise<void> {
    try {
      const redis = await this.ensureConnected();
      const listKey = this.getListKey(list.id, userId);

      // Store the list
      await redis.set(listKey, this.serializeTodoList(list), {
        EX: this.config.ttl,
      });

      // Store individual todos and mappings
      for (const todo of list.todos) {
        await this.upsertTodo(todo, list.id, userId);
      }

      log((l) =>
        l.debug('Todo list upserted to Redis', {
          listId: list.id,
          userId,
          todoCount: list.todos.length,
        }),
      );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::upsertTodoList',
      });
      throw error;
    }
  }

  async getTodoList(
    listId: string,
    userId?: string,
    options?: { completed?: boolean },
  ): Promise<TodoList | undefined> {
    try {
      const redis = await this.ensureConnected();
      const listKey = this.getListKey(listId, userId);

      const data = await redis.get(listKey);
      if (!data) {
        return undefined;
      }

      const list = this.deserializeTodoList(data);

      // Filter by completion status if requested
      if (options?.completed !== undefined) {
        const filteredTodos = list.todos.filter(
          (todo) => todo.completed === options.completed,
        );
        return { ...list, todos: filteredTodos };
      }

      return list;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodoList',
      });
      throw error;
    }
  }

  async getTodoLists(
    userId?: string,
    options?: { completed?: boolean },
  ): Promise<TodoList[]> {
    try {
      const redis = await this.ensureConnected();
      const pattern = this.getListPattern(userId);

      // Get all list keys
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return [];
      }

      // Fetch all lists
      const values = await redis.mGet(keys);
      const lists = values
        .filter((value): value is string => value !== null)
        .map((value) => this.deserializeTodoList(value));

      // Filter by completion status if requested
      if (options?.completed !== undefined) {
        return lists.map((list) => ({
          ...list,
          todos: list.todos.filter(
            (todo) => todo.completed === options.completed,
          ),
        }));
      }

      return lists;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodoLists',
      });
      throw error;
    }
  }

  async deleteTodoList(listId: string, userId?: string): Promise<boolean> {
    try {
      const redis = await this.ensureConnected();
      const list = await this.getTodoList(listId, userId);

      if (!list) {
        return false;
      }

      // Delete all todos in this list in parallel
      await Promise.all(list.todos.map((todo) => this.deleteTodo(todo.id, userId)));

      // Delete the list itself
      const listKey = this.getListKey(listId, userId);
      const result = await redis.del(listKey);

      log((l) =>
        l.debug('Todo list deleted from Redis', {
          listId,
          userId,
          deleted: result > 0,
        }),
      );

      return result > 0;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::deleteTodoList',
      });
      throw error;
    }
  }

  async upsertTodo(
    todo: Todo,
    listId: string,
    userId?: string,
  ): Promise<void> {
    try {
      const redis = await this.ensureConnected();
      const todoKey = this.getTodoKey(todo.id, userId);
      const mappingKey = this.getTodoToListKey(todo.id, userId);

      // Store the todo
      await redis.set(todoKey, this.serializeTodo(todo), {
        EX: this.config.ttl,
      });

      // Store the mapping
      await redis.set(mappingKey, listId, {
        EX: this.config.ttl,
      });

      log((l) =>
        l.debug('Todo upserted to Redis', {
          todoId: todo.id,
          listId,
          userId,
        }),
      );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::upsertTodo',
      });
      throw error;
    }
  }

  async getTodo(todoId: string, userId?: string): Promise<Todo | undefined> {
    try {
      const redis = await this.ensureConnected();
      const todoKey = this.getTodoKey(todoId, userId);

      const data = await redis.get(todoKey);
      if (!data) {
        return undefined;
      }

      return this.deserializeTodo(data);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodo',
      });
      throw error;
    }
  }

  async getTodos(userId?: string, completed?: boolean): Promise<Todo[]> {
    try {
      const redis = await this.ensureConnected();
      const pattern = this.getTodoPattern(userId);

      // Get all todo keys
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return [];
      }

      // Fetch all todos
      const values = await redis.mGet(keys);
      const todos = values
        .filter((value): value is string => value !== null)
        .map((value) => this.deserializeTodo(value));

      // Filter by completion status if requested
      if (completed !== undefined) {
        return todos.filter((todo) => todo.completed === completed);
      }

      return todos;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodos',
      });
      throw error;
    }
  }

  async deleteTodo(todoId: string, userId?: string): Promise<boolean> {
    try {
      const redis = await this.ensureConnected();
      const todoKey = this.getTodoKey(todoId, userId);
      const mappingKey = this.getTodoToListKey(todoId, userId);

      // Delete both the todo and its mapping
      const results = await Promise.all([
        redis.del(todoKey),
        redis.del(mappingKey),
      ]);

      log((l) =>
        l.debug('Todo deleted from Redis', {
          todoId,
          userId,
          deleted: results[0] > 0,
        }),
      );

      return results[0] > 0;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::deleteTodo',
      });
      throw error;
    }
  }

  async getTodoToListMapping(
    todoId: string,
    userId?: string,
  ): Promise<string | undefined> {
    try {
      const redis = await this.ensureConnected();
      const mappingKey = this.getTodoToListKey(todoId, userId);

      const listId = await redis.get(mappingKey);
      return listId ?? undefined;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodoToListMapping',
      });
      throw error;
    }
  }

  async getCount(userId?: string): Promise<number> {
    try {
      const redis = await this.ensureConnected();
      const pattern = this.getTodoPattern(userId);

      const keys = await redis.keys(pattern);
      return keys.length;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::getCount',
      });
      throw error;
    }
  }

  async clearAll(userId?: string): Promise<void> {
    try {
      const redis = await this.ensureConnected();

      // Get all keys for this user (or all if no userId)
      const listPattern = this.getListPattern(userId);
      const todoPattern = this.getTodoPattern(userId);
      const userSegment = userId ? `:user:${userId}` : '';
      const mappingPattern = `${this.config.keyPrefix}:mapping${userSegment}:*`;

      const [listKeys, todoKeys, mappingKeys] = await Promise.all([
        redis.keys(listPattern),
        redis.keys(todoPattern),
        redis.keys(mappingPattern),
      ]);

      const allKeys = [...listKeys, ...todoKeys, ...mappingKeys];

      if (allKeys.length > 0) {
        await redis.del(allKeys);
      }

      log((l) =>
        l.debug('Cleared all todos from Redis', {
          userId,
          keysDeleted: allKeys.length,
        }),
      );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDown(error, {
        log: true,
        source: 'RedisStorageStrategy::clearAll',
      });
      throw error;
    }
  }
}

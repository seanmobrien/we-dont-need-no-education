import type { RedisClientType } from '@/lib/redis-client';
import { getRedisClient } from '@/lib/redis-client';
import type { Todo, TodoList } from '../types';
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
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::initializeRedis',
      });
      throw error;
    }
  }

  /**
   * Generate Redis key for a todo list metadata entry
   */
  private getListKey(listId: string): string {
    return `${this.config.keyPrefix}:list:${listId}`;
  }

  /**
   * Generate Redis key for the sorted set of todo IDs for a list
   */
  private getListTodosKey(listId: string): string {
    return `${this.config.keyPrefix}:list:${listId}:todos`;
  }

  /**
   * Generate Redis key for a todo item
   */
  private getTodoKey(todoId: string): string {
    return `${this.config.keyPrefix}:todo:${todoId}`;
  }

  /**
   * Generate Redis key for todo-to-list mapping
   */
  private getTodoToListKey(todoId: string): string {
    return `${this.config.keyPrefix}:mapping:${todoId}`;
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
   * Serialize todo list metadata for JSON storage
   */
  private serializeTodoListMetadata(list: TodoList): string {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { todos, ...metadata } = list;
    return JSON.stringify({
      ...metadata,
      createdAt: metadata.createdAt.toISOString(),
      updatedAt: metadata.updatedAt.toISOString(),
    });
  }

  /**
   * Deserialize todo list metadata from JSON storage
   */
  private deserializeTodoListMetadata(data: string): Omit<TodoList, 'todos'> {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  }

  private async getTodoIdsForList(
    redis: RedisClientType,
    listId: string,
  ): Promise<string[]> {
    const listTodosKey = this.getListTodosKey(listId);
    return redis.zRange(listTodosKey, 0, -1);
  }

  private async hydrateTodos(
    redis: RedisClientType,
    listId: string,
    options?: { completed?: boolean },
  ): Promise<Todo[]> {
    const todoIds = await this.getTodoIdsForList(redis, listId);
    if (todoIds.length === 0) {
      return [];
    }

    const todoKeys = todoIds.map((id) => this.getTodoKey(id));
    const values = await redis.mGet(todoKeys);
    const todos = values
      .map((value) => (value ? this.deserializeTodo(value) : undefined))
      .filter((value): value is Todo => Boolean(value));

    if (options?.completed !== undefined) {
      return todos.filter((todo) => todo.completed === options.completed);
    }

    return todos;
  }

  async upsertTodoList(list: TodoList): Promise<TodoList> {
    try {
      const redis = await this.ensureConnected();
      const listKey = this.getListKey(list.id);
      const listTodosKey = this.getListTodosKey(list.id);

      // Before storing new todos, clean up old ones
      const existingTodoIds = await this.getTodoIdsForList(redis, list.id);
      if (existingTodoIds.length > 0) {
        const incomingIds = new Set(list.todos.map((todo) => todo.id));
        const removedIds = existingTodoIds.filter(
          (todoId) => !incomingIds.has(todoId),
        );
        if (removedIds.length > 0) {
          await Promise.all(
            removedIds.map((todoId) => this.deleteTodo(todoId)),
          );
        }
      }

      // Store the list
      await redis.set(listKey, this.serializeTodoListMetadata(list), {
        EX: this.config.ttl,
      });

      // Store individual todos and mappings in parallel
      await Promise.all(
        list.todos.map((todo) => this.upsertTodo(todo, { list: list.id })),
      );

      // Refresh TTL on membership set to align with metadata
      await redis.expire(listTodosKey, this.config.ttl);

      log((l) =>
        l.debug('Todo list upserted to Redis', {
          listId: list.id,
          todoCount: list.todos.length,
        }),
      );

      return list;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::upsertTodoList',
      });
      throw error;
    }
  }

  async getTodoList(
    listId: string,
    options?: { completed?: boolean },
  ): Promise<TodoList | undefined> {
    try {
      const redis = await this.ensureConnected();
      const listKey = this.getListKey(listId);

      const data = await redis.get(listKey);
      if (!data) {
        return undefined;
      }

      const metadata = this.deserializeTodoListMetadata(data);
      const todos = await this.hydrateTodos(redis, listId, options);

      return {
        ...metadata,
        todos,
      };
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodoList',
      });
      throw error;
    }
  }

  async getTodoLists(options: {
    prefix: string;
    completed?: boolean;
  }): Promise<TodoList[]> {
    try {
      const redis = await this.ensureConnected();
      const pattern = `${this.config.keyPrefix}:list:${options.prefix}*`;

      // Get all list keys using non-blocking scanIterator
      const keys: string[] = [];
      for await (const key of redis.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        keys.push(key);
      }
      const metadataKeys = keys.filter((key) => !key.endsWith(':todos'));
      if (metadataKeys.length === 0) {
        return [];
      }

      // Fetch all lists
      const values = await redis.mGet(metadataKeys);
      const entries = metadataKeys
        .map((key, index) => ({ key, value: values[index] }))
        .filter(
          (entry): entry is { key: string; value: string } =>
            entry.value !== null,
        );

      const hydratedLists = await Promise.all(
        entries.map(async ({ key, value }) => {
          const listMetadata = this.deserializeTodoListMetadata(value);
          const listId = listMetadata.id ?? key.split(':').pop() ?? key;
          const todos = await this.hydrateTodos(redis, listId, {
            completed: options.completed,
          });
          return {
            ...listMetadata,
            id: listId,
            todos,
          } satisfies TodoList;
        }),
      );

      return hydratedLists;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodoLists',
      });
      throw error;
    }
  }

  async deleteTodoList(listId: string): Promise<boolean> {
    try {
      const redis = await this.ensureConnected();
      const metadata = await redis.get(this.getListKey(listId));
      if (!metadata) {
        return false;
      }

      const todoIds = await this.getTodoIdsForList(redis, listId);
      if (todoIds.length > 0) {
        await Promise.all(todoIds.map((todoId) => this.deleteTodo(todoId)));
      }

      // Delete the list metadata and membership set (if still present)
      const deletedKeys = await redis.del([
        this.getListKey(listId),
        this.getListTodosKey(listId),
      ]);

      log((l) =>
        l.debug('Todo list deleted from Redis', {
          listId,
          deleted: deletedKeys > 0,
        }),
      );

      return true;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::deleteTodoList',
      });
      throw error;
    }
  }

  async upsertTodo(
    todo: Todo,
    options: { list: TodoList | string },
  ): Promise<Todo> {
    try {
      const redis = await this.ensureConnected();
      const listId =
        typeof options.list === 'string' ? options.list : options.list.id;
      const todoKey = this.getTodoKey(todo.id);
      const mappingKey = this.getTodoToListKey(todo.id);
      const listTodosKey = this.getListTodosKey(listId);

      // Store the todo
      await redis.set(todoKey, this.serializeTodo(todo), {
        EX: this.config.ttl,
      });

      // Store the mapping
      await redis.set(mappingKey, listId, {
        EX: this.config.ttl,
      });

      // Ensure membership set is updated to include this todo
      await redis.zAdd(listTodosKey, {
        score: todo.createdAt.getTime(),
        value: todo.id,
      });
      await redis.expire(listTodosKey, this.config.ttl);

      log((l) =>
        l.debug('Todo upserted to Redis', {
          todoId: todo.id,
          listId,
        }),
      );

      return todo;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::upsertTodo',
      });
      throw error;
    }
  }

  async getTodo(todoId: string): Promise<Todo | undefined> {
    try {
      const redis = await this.ensureConnected();
      const todoKey = this.getTodoKey(todoId);

      const data = await redis.get(todoKey);
      if (!data) {
        return undefined;
      }

      return this.deserializeTodo(data);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodo',
      });
      throw error;
    }
  }

  async getTodos(options?: {
    prefix?: string;
    completed?: boolean;
  }): Promise<Todo[]> {
    try {
      const redis = await this.ensureConnected();
      const pattern = options?.prefix
        ? `${this.config.keyPrefix}:todo:${options.prefix}*`
        : `${this.config.keyPrefix}:todo:*`;

      // Get all todo keys using scanIterator (non-blocking)
      const keys: string[] = [];
      for await (const key of redis.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        keys.push(key);
      }
      if (keys.length === 0) {
        return [];
      }

      // Fetch all todos
      const values = await redis.mGet(keys);
      const todos = values
        .filter((value): value is string => value !== null)
        .map((value) => this.deserializeTodo(value));

      // Filter by completion status if requested
      if (options?.completed !== undefined) {
        return todos.filter((todo) => todo.completed === options.completed);
      }

      return todos;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodos',
      });
      throw error;
    }
  }

  async deleteTodo(todoId: string): Promise<boolean> {
    try {
      const redis = await this.ensureConnected();
      const todoKey = this.getTodoKey(todoId);
      const mappingKey = this.getTodoToListKey(todoId);
      const listId = await redis.get(mappingKey);

      // Delete both the todo and its mapping
      const results = await Promise.all([
        redis.del(todoKey),
        redis.del(mappingKey),
      ]);

      if (listId) {
        const listTodosKey = this.getListTodosKey(listId);
        await redis.zRem(listTodosKey, todoId);
      }

      log((l) =>
        l.debug('Todo deleted from Redis', {
          todoId,
          deleted: results[0] > 0,
        }),
      );

      return results[0] > 0;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::deleteTodo',
      });
      throw error;
    }
  }

  async getTodoToListMapping(todoId: string): Promise<string | undefined> {
    try {
      const redis = await this.ensureConnected();
      const mappingKey = this.getTodoToListKey(todoId);

      const listId = await redis.get(mappingKey);
      return listId ?? undefined;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::getTodoToListMapping',
      });
      throw error;
    }
  }

  async getCount(options?: { prefix: string }): Promise<number> {
    try {
      const redis = await this.ensureConnected();
      const pattern = options?.prefix
        ? `${this.config.keyPrefix}:todo:${options.prefix}*`
        : `${this.config.keyPrefix}:todo:*`;

      // Count keys using scanIterator (non-blocking)
      let count = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const key of redis.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        count++;
      }
      return count;
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::getCount',
      });
      throw error;
    }
  }

  async clearAll(options?: { prefix: string }): Promise<{
    todosCleared: number;
    listsCleared: number;
    matchesCleared: number;
  }> {
    try {
      const redis = await this.ensureConnected();

      const prefix = options?.prefix || '';
      const listPattern = prefix
        ? `${this.config.keyPrefix}:list:${prefix}*`
        : `${this.config.keyPrefix}:list:*`;
      const todoPattern = prefix
        ? `${this.config.keyPrefix}:todo:${prefix}*`
        : `${this.config.keyPrefix}:todo:*`;
      const mappingPattern = prefix
        ? `${this.config.keyPrefix}:mapping:${prefix}*`
        : `${this.config.keyPrefix}:mapping:*`;
      const membershipPattern = prefix
        ? `${this.config.keyPrefix}:list:${prefix}*:todos`
        : `${this.config.keyPrefix}:list:*:todos`;

      const listKeys: string[] = [];
      const todoKeys: string[] = [];
      const mappingKeys: string[] = [];
      const membershipKeys: string[] = [];

      // Scan for all matching keys using non-blocking scanIterator
      for await (const key of redis.scanIterator({
        MATCH: listPattern,
        COUNT: 100,
      })) {
        listKeys.push(key);
      }

      for await (const key of redis.scanIterator({
        MATCH: todoPattern,
        COUNT: 100,
      })) {
        todoKeys.push(key);
      }

      for await (const key of redis.scanIterator({
        MATCH: mappingPattern,
        COUNT: 100,
      })) {
        mappingKeys.push(key);
      }

      for await (const key of redis.scanIterator({
        MATCH: membershipPattern,
        COUNT: 100,
      })) {
        membershipKeys.push(key);
      }

      const allKeys = [
        ...listKeys,
        ...todoKeys,
        ...mappingKeys,
        ...membershipKeys,
      ];
      if (allKeys.length > 0) {
        await redis.del(allKeys);
      }

      log((l) =>
        l.debug('Cleared all todos from Redis', {
          prefix,
          keysDeleted: allKeys.length,
          listsCleared: listKeys.length,
          todosCleared: todoKeys.length,
          matchesCleared: mappingKeys.length,
          membershipsCleared: membershipKeys.length,
        }),
      );

      return {
        todosCleared: todoKeys.length,
        listsCleared: listKeys.length,
        matchesCleared: mappingKeys.length,
      };
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RedisStorageStrategy::clearAll',
      });
      throw error;
    }
  }

  equals(other: TodoStorageStrategy): boolean {
    if (!(other instanceof RedisStorageStrategy)) {
      return false;
    }
    return (
      this.config.ttl === other.config.ttl &&
      this.config.keyPrefix === other.config.keyPrefix &&
      this.config.enableFallback === other.config.enableFallback
    );
  }
}

import type { Todo, TodoList } from '../todo-manager';

/**
 * Storage strategy interface for todo-lists and items.
 *
 * Implementations must handle persistence and retrieval of todo data,
 * supporting user segmentation where applicable.
 */
export interface TodoStorageStrategy {
  /**
   * Store or update a todo list
   */
  upsertTodoList(list: TodoList, userId?: string): Promise<void>;

  /**
   * Retrieve a specific todo list by ID
   */
  getTodoList(
    listId: string,
    userId?: string,
    options?: { completed?: boolean },
  ): Promise<TodoList | undefined>;

  /**
   * Retrieve all todo lists
   */
  getTodoLists(
    userId?: string,
    options?: { completed?: boolean },
  ): Promise<TodoList[]>;

  /**
   * Delete a todo list by ID
   */
  deleteTodoList(listId: string, userId?: string): Promise<boolean>;

  /**
   * Store or update a single todo item
   */
  upsertTodo(todo: Todo, listId: string, userId?: string): Promise<void>;

  /**
   * Retrieve a specific todo by ID
   */
  getTodo(todoId: string, userId?: string): Promise<Todo | undefined>;

  /**
   * Retrieve all todos across all lists
   */
  getTodos(userId?: string, completed?: boolean): Promise<Todo[]>;

  /**
   * Delete a todo by ID
   */
  deleteTodo(todoId: string, userId?: string): Promise<boolean>;

  /**
   * Get the mapping of todo ID to list ID
   */
  getTodoToListMapping(
    todoId: string,
    userId?: string,
  ): Promise<string | undefined>;

  /**
   * Get total count of todos
   */
  getCount(userId?: string): Promise<number>;

  /**
   * Clear all data (for testing/reset)
   */
  clearAll(userId?: string): Promise<void>;
}

/**
 * Configuration for storage strategies
 */
export interface StorageStrategyConfig {
  /**
   * Time-to-live for cached entries (Redis only), in seconds
   */
  ttl?: number;

  /**
   * Key prefix for storage keys (Redis only)
   */
  keyPrefix?: string;

  /**
   * Enable graceful fallback to in-memory on errors
   */
  enableFallback?: boolean;
}

/**
 * Storage strategy type identifier
 */
export type StorageStrategyType = 'in-memory' | 'redis';

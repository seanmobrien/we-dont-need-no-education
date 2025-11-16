import type { Todo, TodoList } from '../types';

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
  upsertTodoList(list: TodoList): Promise<TodoList>;

  /**
   * Retrieve a specific todo list by ID
   */
  getTodoList(
    listId: string,
    options?: { completed?: boolean },
  ): Promise<TodoList | undefined>;

  /**
   * Retrieve all todo lists
   */
  getTodoLists(options: {
    prefix: string;
    completed?: boolean;
  }): Promise<TodoList[]>;

  /**
   * Delete a todo list by ID
   */
  deleteTodoList(listId: string): Promise<boolean>;

  /**
   * Store or update a single todo item
   */
  upsertTodo(todo: Todo, options: { list: TodoList | string }): Promise<Todo>;

  /**
   * Retrieve a specific todo by ID
   */
  getTodo(todoId: string): Promise<Todo | undefined>;

  /**
   * Retrieve all todos across all lists
   */
  getTodos(options?: { prefix?: string; completed?: boolean }): Promise<Todo[]>;

  /**
   * Delete a todo by ID
   */
  deleteTodo(todoId: string): Promise<boolean>;

  /**
   * Get the mapping of todo ID to list ID
   */
  getTodoToListMapping(todoId: string): Promise<string | undefined>;

  /**
   * Get total count of todos
   */
  getCount(options?: { prefix: string }): Promise<number>;

  /**
   * Clear all data (for testing/reset)
   */
  clearAll(options?: { prefix: string }): Promise<{
    todosCleared: number;
    listsCleared: number;
    matchesCleared: number;
  }>;

  /**
   * Compare this storage strategy with another for equality.
   * @param other The TodoStorageStrategy to compare this instance against
   * @returns true if the two storage strategies are functionally equivalent, otherwise fase.
   */
  equals(other: TodoStorageStrategy): boolean;
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

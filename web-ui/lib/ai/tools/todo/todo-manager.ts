import { log } from '@/lib/logger';
import type { TodoStorageStrategy } from './storage';
import { InMemoryStorageStrategy } from './storage';

export type TodoStatus = 'pending' | 'active' | 'complete';

export type TodoPriority = 'high' | 'medium' | 'low';

/**
 * Represents a single todo item in the system.
 */
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoList {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  todos: Todo[];
  createdAt: Date;
  updatedAt: Date;
}

export type TodoListUpsertInput = {
  id?: string;
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  createdAt?: Date;
  updatedAt?: Date;
  todos?: Array<{
    id?: string;
    title: string;
    description?: string;
    completed?: boolean;
    status?: TodoStatus;
    priority?: TodoPriority;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
};

const DEFAULT_LIST_ID = 'default';
const DEFAULT_LIST_TITLE = 'Default Todo List';
const DEFAULT_LIST_STATUS: TodoStatus = 'active';
const DEFAULT_LIST_PRIORITY: TodoPriority = 'medium';

/**
 * TodoManager - Manages todo lists and items with pluggable storage strategies.
 *
 * This class provides CRUD operations for managing todos and their lists. It uses
 * dependency injection to support different storage backends (in-memory, Redis, etc.)
 * while maintaining a consistent API.
 *
 * @param storage - Storage strategy implementation (defaults to in-memory)
 * @param userId - Optional user ID for user-specific data segmentation
 */
export class TodoManager {
  private storage: TodoStorageStrategy;
  private userId?: string;

  constructor(storage?: TodoStorageStrategy, userId?: string) {
    this.storage = storage ?? new InMemoryStorageStrategy();
    this.userId = userId;
    log((l) => l.debug('TodoManager instance created', { userId }));
  }

  /**
   * Create a new todo item inside the default list. This is primarily used by
   * legacy flows that still operate at the item level.
   */
  async createTodo(
    title: string,
    description?: string,
    options?: { status?: TodoStatus; priority?: TodoPriority },
  ): Promise<Todo> {
    const list = await this.ensureDefaultList();
    const todo = this.createTodoRecord({
      title,
      description,
      status: options?.status,
      priority: options?.priority,
    });

    list.todos.push(todo);
    list.updatedAt = todo.updatedAt;

    await this.storage.upsertTodo(todo, list.id, this.userId);
    await this.storage.upsertTodoList(list, this.userId);

    log((l) => l.debug('Todo created', { id: todo.id, title }));

    return todo;
  }

  /**
   * Upsert (create or replace) a todo list.
   */
  async upsertTodoList(input: TodoListUpsertInput): Promise<TodoList> {
    const listId = input.id ?? this.generateListId();
    const now = new Date();

    const existingList = await this.storage.getTodoList(listId, this.userId);

    const createdAt = input.createdAt ?? existingList?.createdAt ?? now;
    const todos = (input.todos ?? []).map((todoInput) =>
      this.createTodoRecord(todoInput),
    );

    const list: TodoList = {
      id: listId,
      title: input.title,
      description: input.description,
      status: input.status ?? 'active',
      priority: input.priority ?? 'medium',
      todos,
      createdAt,
      updatedAt: input.updatedAt ?? now,
    };

    await this.storage.upsertTodoList(list, this.userId);

    log((l) =>
      l.debug('Todo list upserted', {
        id: listId,
        title: input.title,
        replaced: Boolean(existingList),
        itemCount: todos.length,
      }),
    );

    return list;
  }

  /**
   * Retrieve all todo lists, optionally filtering todos by completion state.
   */
  async getTodoLists(options?: { completed?: boolean }): Promise<TodoList[]> {
    return await this.storage.getTodoLists(this.userId, options);
  }

  /**
   * Retrieve a single todo list by ID.
   */
  async getTodoList(
    id: string,
    options?: { completed?: boolean },
  ): Promise<TodoList | undefined> {
    return await this.storage.getTodoList(id, this.userId, options);
  }

  /**
   * Get all todos, optionally filtered by completion status.
   */
  async getTodos(completed?: boolean): Promise<Todo[]> {
    return await this.storage.getTodos(this.userId, completed);
  }

  /**
   * Get a specific todo by ID.
   */
  async getTodo(id: string): Promise<Todo | undefined> {
    return await this.storage.getTodo(id, this.userId);
  }

  /**
   * Update an existing todo.
   */
  async updateTodo(
    id: string,
    updates: {
      title?: string;
      description?: string;
      completed?: boolean;
      status?: TodoStatus;
      priority?: TodoPriority;
    },
  ): Promise<Todo | undefined> {
    const todo = await this.storage.getTodo(id, this.userId);
    if (!todo) {
      return undefined;
    }

    const listId = await this.storage.getTodoToListMapping(id, this.userId);
    const list = listId
      ? await this.storage.getTodoList(listId, this.userId)
      : undefined;

    if (!list) {
      await this.storage.deleteTodo(id, this.userId);
      return undefined;
    }

    const { status: nextStatus, completed: nextCompleted } =
      this.resolveStatusAndCompletion(todo, updates);
    const nextPriority = updates.priority ?? todo.priority;

    const updatedTodo: Todo = {
      ...todo,
      title: updates.title ?? todo.title,
      description: updates.description ?? todo.description,
      priority: nextPriority,
      status: nextStatus,
      completed: nextCompleted,
      updatedAt: new Date(),
    };

    await this.storage.upsertTodo(updatedTodo, listId, this.userId);

    const idx = list.todos.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list.todos[idx] = updatedTodo;
    } else {
      list.todos.push(updatedTodo);
    }
    list.updatedAt = updatedTodo.updatedAt;
    this.updateListStatus(list);

    await this.storage.upsertTodoList(list, this.userId);

    log((l) => l.debug('Todo updated', { id, updates }));

    return updatedTodo;
  }

  /**
   * Delete a todo by ID.
   */
  async deleteTodo(id: string): Promise<boolean> {
    const listId = await this.storage.getTodoToListMapping(id, this.userId);
    const list = listId
      ? await this.storage.getTodoList(listId, this.userId)
      : undefined;

    const result = await this.storage.deleteTodo(id, this.userId);

    if (list) {
      const nextTodos = list.todos.filter((todo) => todo.id !== id);
      if (nextTodos.length !== list.todos.length) {
        list.todos = nextTodos;
        list.updatedAt = new Date();
        this.updateListStatus(list);
        await this.storage.upsertTodoList(list, this.userId);
      }
    }

    if (result) {
      log((l) => l.debug('Todo deleted', { id }));
    }

    return result;
  }

  /**
   * Toggle the completed status of a todo.
   */
  async toggleTodo(id: string): Promise<TodoList | undefined> {
    const todo = await this.storage.getTodo(id, this.userId);
    if (!todo) {
      return undefined;
    }

    const listId = await this.storage.getTodoToListMapping(id, this.userId);
    if (!listId) {
      await this.storage.deleteTodo(id, this.userId);
      return undefined;
    }

    const list = await this.storage.getTodoList(listId, this.userId);
    if (!list) {
      await this.storage.deleteTodo(id, this.userId);
      return undefined;
    }

    const { status: nextStatus, completed: nextCompleted } =
      this.advanceTodoState(todo);

    const updatedTodo: Todo = {
      ...todo,
      status: nextStatus,
      completed: nextCompleted,
      updatedAt: new Date(),
    };

    await this.storage.upsertTodo(updatedTodo, listId, this.userId);

    const idx = list.todos.findIndex((item) => item.id === id);
    if (idx !== -1) {
      list.todos[idx] = updatedTodo;
    } else {
      list.todos.push(updatedTodo);
    }

    list.updatedAt = updatedTodo.updatedAt;
    this.updateListStatus(list);

    await this.storage.upsertTodoList(list, this.userId);

    log((l) =>
      l.debug('Todo toggled', {
        id,
        listId,
        status: updatedTodo.status,
        completed: updatedTodo.completed,
      }),
    );

    return this.cloneListWithFilter(list);
  }

  /**
   * Clear all todos and lists.
   */
  async clearAll(): Promise<void> {
    await this.storage.clearAll(this.userId);
    log((l) => l.debug('All todos and lists cleared'));
  }

  /**
   * Get the total count of todos across all lists.
   */
  async getCount(): Promise<number> {
    return await this.storage.getCount(this.userId);
  }

  private createTodoRecord(
    input: {
      id?: string;
      title?: string;
      description?: string;
      completed?: boolean;
      status?: TodoStatus;
      priority?: TodoPriority;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ): Todo {
    const id =
      input.id ??
      `todo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const { status, completed } = this.resolveCreationStatusAndCompletion({
      status: input.status,
      completed: input.completed,
    });

    const createdAt = input.createdAt ?? now;
    const updatedAt = input.updatedAt ?? now;

    const todo: Todo = {
      id,
      title: input.title ?? 'Untitled Task',
      description: input.description,
      completed,
      status,
      priority: input.priority ?? 'medium',
      createdAt,
      updatedAt,
    };

    return todo;
  }

  private resolveStatusAndCompletion(
    todo: Todo,
    updates: {
      completed?: boolean;
      status?: TodoStatus;
    },
  ): { status: TodoStatus; completed: boolean } {
    let nextStatus = todo.status;
    let nextCompleted = todo.completed;

    if (updates.status) {
      nextStatus = updates.status;
      nextCompleted = updates.status === 'complete';
    }

    if (updates.completed !== undefined) {
      nextCompleted = updates.completed;
      nextStatus = updates.completed
        ? 'complete'
        : this.inferIncompleteStatus(nextStatus);
    }

    return { status: nextStatus, completed: nextCompleted };
  }

  private resolveCreationStatusAndCompletion(options?: {
    status?: TodoStatus;
    completed?: boolean;
  }): { status: TodoStatus; completed: boolean } {
    const statusFromInput = options?.status;
    const completedFromInput = options?.completed;

    if (statusFromInput) {
      return {
        status: statusFromInput,
        completed:
          completedFromInput !== undefined
            ? completedFromInput
            : statusFromInput === 'complete',
      };
    }

    if (completedFromInput !== undefined) {
      return {
        status: completedFromInput ? 'complete' : 'active',
        completed: completedFromInput,
      };
    }

    return { status: 'pending', completed: false };
  }

  private inferIncompleteStatus(previousStatus: TodoStatus): TodoStatus {
    if (previousStatus === 'complete') {
      return 'active';
    }

    return previousStatus;
  }

  private advanceTodoState(todo: Todo): {
    status: TodoStatus;
    completed: boolean;
  } {
    switch (todo.status) {
      case 'pending':
        return { status: 'active', completed: false };
      case 'active':
        return { status: 'complete', completed: true };
      case 'complete':
      default:
        return { status: 'active', completed: false };
    }
  }

  private updateListStatus(list: TodoList): void {
    if (list.todos.length === 0) {
      list.status = 'pending';
      return;
    }

    if (list.todos.every((todo) => todo.completed)) {
      list.status = 'complete';
      return;
    }

    if (list.todos.some((todo) => todo.status !== 'pending')) {
      list.status = 'active';
      return;
    }

    list.status = 'pending';
  }

  private async ensureDefaultList(): Promise<TodoList> {
    const existing = await this.storage.getTodoList(
      DEFAULT_LIST_ID,
      this.userId,
    );
    if (existing) {
      return existing;
    }

    const now = new Date();
    const list: TodoList = {
      id: DEFAULT_LIST_ID,
      title: DEFAULT_LIST_TITLE,
      description: undefined,
      status: DEFAULT_LIST_STATUS,
      priority: DEFAULT_LIST_PRIORITY,
      todos: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.upsertTodoList(list, this.userId);
    return list;
  }

  private cloneListWithFilter(list: TodoList, completed?: boolean): TodoList {
    const todos =
      completed === undefined
        ? [...list.todos]
        : list.todos.filter((todo) => todo.completed === completed);

    return {
      ...list,
      todos,
    };
  }

  private generateListId(): string {
    return `list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

const TODO_MANAGER = Symbol.for('@noeducation/ai/TodoManager');

type GlobalWithTodoManager = typeof globalThis & {
  [TODO_MANAGER]?: TodoManager;
};

/**
 * Get the singleton TodoManager instance.
 * This uses in-memory storage by default for backward compatibility.
 * For feature-flag-based storage strategy selection, use createTodoManager.
 *
 * @returns The TodoManager singleton
 */
export const getTodoManager = (): TodoManager => {
  const globalWithTodoManager = globalThis as GlobalWithTodoManager;
  let todoManagerInstance = globalWithTodoManager[TODO_MANAGER];
  if (!todoManagerInstance) {
    todoManagerInstance = new TodoManager();
    globalWithTodoManager[TODO_MANAGER] = todoManagerInstance;
    log((l) => l.debug('TodoManager singleton instance created'));
  }
  return todoManagerInstance;
};

/**
 * Reset the TodoManager singleton.
 * Useful for testing or when changing storage strategies.
 */
export const resetTodoManager = (): void => {
  const globalWithTodoManager = globalThis as GlobalWithTodoManager;
  if (globalWithTodoManager[TODO_MANAGER]) {
    delete globalWithTodoManager[TODO_MANAGER];
    log((l) => l.debug('TodoManager singleton reset'));
  }
};

/**
 * Create a TodoManager instance with a specific storage strategy.
 *
 * @param storage - Storage strategy implementation
 * @param userId - Optional user ID for user-specific data segmentation
 * @returns A new TodoManager instance
 */
export const createTodoManager = (
  storage?: TodoStorageStrategy,
  userId?: string,
): TodoManager => {
  return new TodoManager(storage, userId);
};

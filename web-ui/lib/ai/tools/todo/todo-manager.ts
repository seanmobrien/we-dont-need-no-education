import { auth } from '@/auth';
import { Session } from '@auth/core/types';
import { log, logEvent, EventSeverity } from '@/lib/logger';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server';
import { ApiRequestError } from '@/lib/send-api-request';
import {
  globalSingleton,
  SingletonProvider,
} from '@/lib/typescript/singleton-provider';
import { NextResponse } from 'next/server';

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
  userId?: string;
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
  userId?: string;
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
const DEFAULT_LIST_DESCRIPTION = 'This is the default todo list.';
const DEFAULT_LIST_STATUS: TodoStatus = 'active';
const DEFAULT_LIST_PRIORITY: TodoPriority = 'medium';

const RAW_LIST: unique symbol = Symbol('RAW_LIST');

const RAW_LIST: unique symbol = Symbol('RAW_LIST');

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
  private todos: Map<string, Todo> = new Map();
  private todoLists: Map<string, TodoList> = new Map();
  private todoToList: Map<string, string> = new Map();

  constructor() {
    log((l) => l.debug('TodoManager instance created'));
  }

  /**
   * Create a new todo item inside the default list. This is primarily used by
   * legacy flows that still operate at the item level.
   */
  async createTodo(
  async createTodo(
    title: string,
    description?: string,
    options?: {
      status?: TodoStatus;
      priority?: TodoPriority;
      session?: Session | null;
      listId?: string;
    },
  ): Promise<Todo> {
    const list = await (options?.listId
      ? this.getTodoList(options.listId, {
          session: options?.session,
          [RAW_LIST]: true,
        })
      : this.ensureDefaultList({ session: options?.session }));
    if (!list) {
      throw new ApiRequestError(
        'Unable to find or create default todo list',
        NextResponse.json(
          { error: 'Unable to find or create default todo list' },
          { status: 405 },
        ),
      );
    }
    const todo = await this.createTodoRecord(
      {
        title,
        description,
        status: options?.status,
        priority: options?.priority,
      },
      list,
      options?.session,
    );

    /*
    list.todos.push(todo);
    list.updatedAt = todo.updatedAt;
    this.todos.set(todo.id, todo);
    this.todoToList.set(todo.id, list.id);
    */

    logEvent('info', 'TODO Item created', {
      itemId: todo.id,
      listId: list.id,
    });

    return todo;
  }

  static async #todoItemUpsertInsertFactory(
    todo: Partial<Todo>,
    { activeSession: Session,
    now: Date,
  ): Promise<Todo> {

    const { status: nextStatus, completed: nextCompleted } =
      this.#resolveStatusAndCompletion(
        todo ?? {
          status: updates.status ?? 'pending',
          completed: updates.completed || updates.status === 'complete',
        },
        updates,
      );
    const nextPriority = updates.priority ?? 'medium';

    const now = new Date();

    const updatedTodo: Todo = {
      ...(todo ?? {
        id,
        createdAt: now,
      }),
      title: updates.title ?? todo?.title ?? 'New TODO',
      description:
        updates.description ?? todo?.description ?? 'TODO Description',
      priority: nextPriority,
      status: nextStatus,
      completed: nextCompleted,
      updatedAt: now,
    };

    
  }

  /**
   * Upsert (create or replace) a todo list.
   */
  async upsertTodoList(
    input: TodoListUpsertInput,
    { session }: { session?: Session | null } = {},
  ): Promise<TodoList> {
    let activeSession: Session;
    let listId: string;
    if (input.id) {
      const [s1] = await TodoManager.validateTodoId({
        check: input.id,
        session,
      });
      activeSession = s1;
      listId = input.id;
    } else {
      const [id, s2] = await TodoManager.generateTodoId({
        session,
        salt: 'list',
      });
      activeSession = s2;
      listId = id;
    }
    const now = new Date();

    const existingList = this.todoLists.get(listId);
    const createdAt = input.createdAt ?? existingList?.createdAt ?? now;
    const userId = activeSession.user!.id;

    const list: TodoList = {
      id: listId,
      title: input.title,
      description: input.description,
      status: input.status ?? 'active',
      priority: input.priority ?? 'medium',
      todos: [],
      createdAt,
      updatedAt: input.updatedAt ?? now,
      userId,
    };

    if (existingList) {
      // Remove any tools that are in the currently saved item but not the new data
      existingList.todos
        .filter((todo) => !input.todos?.some((t) => t.id === todo.id))
        .forEach((todo) => {
          this.todos.delete(todo.id);
          this.todoToList.delete(todo.id);
        });
    }
    this.todoLists.set(listId, list);

    const todos = await Promise.all(
      (input.todos ?? []).map((todoInput) =>
        this.createTodoRecord(todoInput, list, activeSession),
      ),
    );
    list.todos = todos;
    logEvent('info', 'TODO List Upserted', {
      userId: activeSession?.user?.id!,
      listId: listId,
      itemCount: todos.length,
    });

    return list;
  }

  /**
   * Retrieve all todo lists, optionally filtering todos by completion state and/or userId.
   */
  async getTodoLists({
    completed,
    session,
  }: { completed?: boolean; session?: Session | null } = {}): Promise<
    TodoList[]
  > {
    const [prefix, activeSession] = await TodoManager.generateTodoPrefix({
      session,
    });
    return Array.from(this.todoLists.entries())
      .filter(([k]) => k.startsWith(prefix))
      .map(([_k, v]) => this.cloneListWithFilter(v, completed));
  }

  /**
   * Retrieve a single todo list by ID, optionally filtering by userId.
   */
  async getTodoList(
  async getTodoList(
    id: string,
    {
      completed,
      session,
      ...options
    }: { completed?: boolean; session?: Session | null; [RAW_LIST]?: boolean },
  ): Promise<TodoList | undefined> {
    await TodoManager.validateTodoId({ check: id, session });
    const list = this.todoLists.get(id);
    if (!list) {
      return undefined;
    }
    return options[RAW_LIST] === true
      ? list
      : this.cloneListWithFilter(list, completed);
  }

  /**
   * Get all todos, optionally filtered by completion status and/or userId.
   * Supports both legacy boolean parameter and new options object for backward compatibility.
   */
  async getTodos(
    completedOrOptions?:
      | boolean
      | { completed?: boolean; session?: Session | null },
  ): Promise<Todo[]> {
    let completed: boolean | undefined;
    let activeSession: Session | null;

    // Handle backward compatibility for boolean parameter
    if (typeof completedOrOptions === 'boolean') {
      completed = completedOrOptions;
      activeSession = await auth();
    } else if (completedOrOptions) {
      completed = completedOrOptions.completed;
      activeSession = completedOrOptions.session ?? (await auth());
    } else {
      completed = undefined;
      activeSession = await auth();
    }
    if (!activeSession) {
      throw new ApiRequestError(
        'No session available',
        unauthorizedServiceResponse(),
      );
    }
    const [prefix] = await TodoManager.generateTodoPrefix({
      session: activeSession,
    });

    let todos = Array.from(this.todos.entries())
      .filter(
        ([k, v]) =>
          k.startsWith(prefix) && v.completed === (completed ?? v.completed),
      )
      .map(([_k, v]) => v);

    return todos;
  }

  /**
   * Get a specific todo by ID.
   */
  async getTodo(
    id: string,
    { session }: { session?: Session | null } = {},
  ): Promise<Todo | undefined> {
    await TodoManager.validateTodoId({ check: id, session });
    return this.todos.get(id);
  }

  /**
   * Update an existing todo. Optionally verify userId for authorization.
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
    options?: { session?: Session | null; listId?: string; list?: TodoList },
  ): Promise<Todo | undefined> {
    let activeSession: Session | null = null;
    if (id) {
      const [ses] = await TodoManager.validateTodoId({
        check: id,
        session: options?.session,
      });
      activeSession = ses;
    } else {
      const [tempId, ses] = await TodoManager.generateTodoId({
        session: options?.session,
      });
      id = tempId;
      activeSession = ses;
    }

    const todo = await this.getTodo(id, { session: activeSession });
    let actualListId: string;
    let list: TodoList;
    if (options?.list) {
      list = options.list;
      actualListId = list.id;
    } else {
      const tryListId =
        options?.listId ??
        (await this.getListIdFromTodoId(id, { session: activeSession }));
      if (tryListId) {
        actualListId = tryListId;
        const tryList = await this.getTodoList(actualListId, {
          session: activeSession,
          [RAW_LIST]: true,
        });
        if (tryList) {
          list = tryList;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
    // Quick sanity check re: the list and todo item belonging together...
    TodoManager.validateTodoId({ check: list.id, session: activeSession });

    const { status: nextStatus, completed: nextCompleted } =
      this.resolveStatusAndCompletion(
        todo ?? {
          status: updates.status ?? 'pending',
          completed: updates.completed || updates.status === 'complete',
        },
        updates,
      );
    const nextPriority = updates.priority ?? 'medium';

    const now = new Date();

    const updatedTodo: Todo = {
      ...(todo ?? {
        id,
        createdAt: now,
      }),
      title: updates.title ?? todo?.title ?? 'New TODO',
      description:
        updates.description ?? todo?.description ?? 'TODO Description',
      priority: nextPriority,
      status: nextStatus,
      completed: nextCompleted,
      updatedAt: now,
    };
    // update in list
    this.todos.set(id, updatedTodo);
    const idx = list.todos.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list.todos[idx] = updatedTodo;
    } else {
      list.todos.push(updatedTodo);
    }
    list.updatedAt = updatedTodo.updatedAt;
    this.updateListStatus(list);
    this.todoLists.set(list.id, list);
    this.todoToList.set(id, list.id);

    logEvent('info', 'TODO Item Updated', {
      userId: activeSession?.user?.id!,
      itemId: id,
      listId: list.id,
    });

    return updatedTodo;
  }

  async getListIdFromTodoId(
    id: string,
    { session }: { session?: Session | null } = {},
  ): Promise<string | undefined> {
    const ret = await this.storage.getTodoToListMapping(id);
    if (ret) {
      await TodoManager.validateTodoId({ check: id, session });
    }
    return ret;
  }

  async getListIdFromTodoId(
    id: string,
    { session }: { session?: Session | null } = {},
  ): Promise<string | undefined> {
    const ret = this.todoToList.get(id);
    if (ret) {
      await TodoManager.validateTodoId({ check: id, session });
    }
    return ret;
  }

  /**
   * Delete a todo by ID. Optionally verify userId for authorization.
   */
  async deleteTodo(
    id: string,
    { session }: { session?: Session | null } = {},
  ): Promise<boolean> {
    // Validate we own this id
    const [activeSession] = await TodoManager.validateTodoId({
      check: id,
      session,
    });
    const listId = await this.getListIdFromTodoId(id, {
      session: activeSession,
    });
    const list = listId ? this.todoLists.get(listId) : undefined;

    const result = this.todos.delete(id);
    this.todoToList.delete(id);

    if (list) {
      const nextTodos = list.todos.filter((todo) => todo.id !== id);
      if (nextTodos.length !== list.todos.length) {
        list.todos = nextTodos;
        list.updatedAt = new Date();
        this.updateListStatus(list);
        this.todoLists.set(list.id, list);
      }
    }

    if (result) {
      logEvent('info', 'TODO Item deleted', {
        userId: activeSession?.user?.id!,
        itemId: id,
        listId: listId ?? '[none]',
      });
    }

    return result;
  }

  /**
   * Toggle the completed status of a todo. Optionally verify userId for authorization.
   */
  async toggleTodo(
    id: string,
    { session }: { session?: Session | null } = {},
  ): Promise<TodoList | undefined> {
    const [activeSession] = await TodoManager.validateTodoId({
      check: id,
      session,
    });

    const todo = await this.getTodo(id, { session: activeSession });
    if (!todo) {
      return undefined;
    }

    const listId = await this.getListIdFromTodoId(id, {
      session: activeSession,
    });
    if (!listId) {
      await this.deleteTodo(id, { session: activeSession });
      return undefined;
    }

    const list = await this.getTodoList(listId, {
      session: activeSession,
      [RAW_LIST]: true,
    });
    if (!list) {
      await this.deleteTodo(id, { session: activeSession });
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

    const idx = list.todos.findIndex((item) => item.id === id);
    if (idx !== -1) {
      list.todos[idx] = updatedTodo;
    } else {
      list.todos.push(updatedTodo);
    }

    list.updatedAt = updatedTodo.updatedAt;
    this.updateListStatus(list);

    this.todos.set(id, updatedTodo);
    this.todoLists.set(list.id, list);

    logEvent('info', 'TODO Item toggled', {
      userId: activeSession.user?.id!,
      itemId: id,
      listId,
      status: updatedTodo.status,
      completed: updatedTodo.completed ? 'true' : 'false',
    });

    return this.cloneListWithFilter(list);
  }

  /**
   * Clear all todos and lists for a specific user session.
   */
  async clearAll({
    session,
  }: {
    session?: Session | null;
  } = {}): Promise<void> {
    const [prefix, activeSession] = await TodoManager.generateTodoPrefix({
      session,
    });

    // Delete all todos and lists that match the user's prefix
    const todoIdsToDelete = Array.from(this.todos.keys()).filter((id) =>
      id.startsWith(prefix),
    );
    const listIdsToDelete = Array.from(this.todoLists.keys()).filter((id) =>
      id.startsWith(prefix),
    );

    todoIdsToDelete.forEach((id) => {
      this.todos.delete(id);
      this.todoToList.delete(id);
    });

    listIdsToDelete.forEach((id) => {
      this.todoLists.delete(id);
    });

    logEvent('info', 'TODO items and lists cleared for user', {
      userId: activeSession?.user?.id!,
      todosCleared: todoIdsToDelete.length,
      listsCleared: listIdsToDelete.length,
    });
  }

  /**
   * Get the total count of todos across all lists for a specific user.
   */
  async getCount({
    session,
  }: {
    session?: Session | null;
  } = {}): Promise<number> {
    const [prefix] = await TodoManager.generateTodoPrefix({ session });
    return Array.from(this.todos.keys()).filter((id) => id.startsWith(prefix))
      .length;
  }

  private async createTodoRecord(
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
    list: TodoList,
    session?: Session | null,
  ): Promise<Todo> {
    if (!list) {
      throw new TypeError('Todo list is required to create a todo item');
    }
    let activeSession: Session | null = null;
    let inputId: string;
    if (input.id) {
      const [active] = await TodoManager.validateTodoId({
        check: input.id,
        session,
      });
      inputId = input.id;
      activeSession = active;
    } else {
      let [id, active] = await TodoManager.generateTodoId({
        suffix: undefined,
        session,
        salt: 'todo',
      });
      activeSession = active;
      inputId = id;
    }

    const now = new Date();
    const { status, completed } = this.resolveCreationStatusAndCompletion({
      status: input.status,
      completed: input.completed,
    });

    const createdAt = input.createdAt ?? now;
    const updatedAt = input.updatedAt ?? now;

    const todo: Todo = {
      id: inputId,
      title: input.title ?? 'Untitled Task',
      description: input.description,
      completed,
      status,
      priority: input.priority ?? 'medium',
      createdAt,
      updatedAt,
    };
    const result = await this.updateTodo(inputId, todo, {
      session: activeSession,
      list: list,
    });
    if (!result) {
      throw new ApiRequestError(
        'Failed to create todo record',
        NextResponse.json(
          { error: 'Failed to create todo record' },
          { status: 500 },
        ),
      );
    }
    return result;
  }

  private resolveStatusAndCompletion(
    todo: { status: TodoStatus; completed: boolean },
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

  private static async generateTodoPrefix(
    options: {
      session?: Session | null;
    } = {},
  ): Promise<[string, Session]> {
    const activeSession = options.session ?? (await auth());
    if (!activeSession) {
      throw new ApiRequestError(
        'No session available',
        unauthorizedServiceResponse(),
      );
    }
    const userId = activeSession.user?.id;
    if (!userId) {
      throw new ApiRequestError(
        'Session does not contain user information',
        unauthorizedServiceResponse(),
      );
    }
    const prefix = `todo::user-${userId}::`;
    return [prefix, activeSession];
  }

  private static async generateTodoId(
    options: {
      session?: Session | null;
      suffix?: string;
      salt?: string;
    } = {},
  ): Promise<[string, Session]> {
    const [prefix, activeSession] = await this.generateTodoPrefix({
      session: options.session,
    });
    return [
      `${prefix}${Date.now()}${options.salt ? `:${options.salt}` : ''}-${options.suffix ?? Math.random().toString(36).substring(2, 9)}`,
      activeSession,
    ];
  }

  private static async validateTodoId(options: {
    check: string;
    session?: Session | null;
  }): Promise<[Session]> {
    const [prefix, activeSession] = await this.generateTodoPrefix({
      session: options.session,
    });
    const isValid = options.check.startsWith(prefix);
    if (!isValid) {
      throw new ApiRequestError(
        'User does not have access to this todo item',
        unauthorizedServiceResponse(),
      );
    }
    return [activeSession];
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

  private updateListStatus(list: TodoList): boolean {
    const initialValue = list.status;
    const agg = list.todos.reduce(
      (acc, todo) => {
        acc.total += 1;
        if (todo.completed) {
          acc.complete += 1;
        } else {
          acc[todo.status] += 1;
        }
        return acc;
      },
      { complete: 0, active: 0, pending: 0, total: 0 },
    );
    if (agg.total === 0) {
      list.status = 'pending';
    } else if (agg.complete === agg.total) {
      list.status = 'complete';
    } else if (agg.active > 0) {
      list.status = 'active';
    } else {
      list.status = 'pending';
    }
    return list.status !== initialValue;
  }

  private async ensureDefaultList({
    session,
  }: {
    session?: Session | null;
  }): Promise<TodoList> {
    // Use different default list IDs for different users
    const [prefix, activeSession] = await TodoManager.generateTodoPrefix({
      session,
    });
    const listId = `${prefix}${DEFAULT_LIST_ID}`;

    const existing = await this.getTodoList(listId, {
      session: activeSession,
      [RAW_LIST]: true,
    });
    if (existing) {
      return existing;
    }

    const now = new Date();
    const list = await this.upsertTodoList(
      {
        id: listId,
        title: DEFAULT_LIST_TITLE,
        description: undefined,
        status: DEFAULT_LIST_STATUS,
        priority: DEFAULT_LIST_PRIORITY,
        todos: [],
        createdAt: now,
        updatedAt: now,
      },
      { session: activeSession },
    );
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
}

export const getTodoManager = (): TodoManager => {
  return globalSingleton('@noeducation/ai/TodoManager', () => {
    log((l) => l.debug('TodoManager singleton instance created'));
    return new TodoManager();
  });
};

/**
 * Reset the TodoManager singleton.
 * Useful for testing or when changing storage strategies.
 */
export const resetTodoManager = (): void => {
  SingletonProvider.Instance.delete('@noeducation/ai/TodoManager');
  log((l) => l.debug('TodoManager singleton reset'));
};

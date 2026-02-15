import { auth } from '@compliance-theater/auth';
import { Session } from '@auth/core/types';
import { log, logEvent } from '@compliance-theater/logger';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server';
import { ApiRequestError } from '@compliance-theater/send-api-request';
import {
  globalRequiredSingletonAsync,
  SingletonProvider,
} from '@compliance-theater/typescript/singleton-provider';
import { NextResponse } from 'next/server';
import type { TodoStorageStrategy } from './storage';
import { InMemoryStorageStrategy } from './storage';
import { isError, LoggedError } from '@compliance-theater/logger';
import type {
  Todo,
  TodoList,
  TodoStatus,
  TodoPriority,
  TodoListUpsertInput,
  TodoUpsertInsert,
} from './types';
import { createStorageStrategyFromFlags } from './todo-manager-factory';
import { createStorageStrategy } from './storage/factory';

const DEFAULT_LIST_ID = 'default';
const DEFAULT_LIST_TITLE = 'Default Todo List';
const DEFAULT_LIST_DESCRIPTION = 'This is the default todo list.';
const DEFAULT_LIST_STATUS: TodoStatus = 'active';
const DEFAULT_PRIORITY: TodoPriority = 'medium';
const DEFAULT_ITEM_TITLE = 'New Task';
const DEFAULT_ITEM_DESCRIPTION = '';

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

  constructor(storage?: TodoStorageStrategy) {
    this.storage = storage ?? new InMemoryStorageStrategy();
    log((l) => l.debug('TodoManager instance created'));
  }

  /**
   * Create a new todo item inside the default list. This is primarily used by
   * legacy flows that still operate at the item level.
   */
  async createTodo(
    title: string,
    description?: string,
    options?: {
      status?: TodoStatus;
      priority?: TodoPriority;
      session?: Session | null;
      listId?: string;
    }
  ): Promise<Todo> {
    const list = await (options?.listId
      ? this.getTodoList(options.listId, {
          session: options?.session,
        })
      : this.ensureDefaultList({ session: options?.session }));
    if (!list) {
      throw new ApiRequestError(
        'Unable to find or create default todo list',
        NextResponse.json(
          { error: 'Unable to find or create default todo list' },
          { status: 405 }
        )
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
      options?.session
    );

    logEvent('info', 'TODO Item created', {
      itemId: todo.id,
      listId: list.id,
    });

    return todo;
  }

  static async #todoItemUpsertInsertFactory(
    todo: TodoUpsertInsert,
    {
      session,
      now: nowFromProps,
      existing,
    }: { session: Session | null; now?: Date; existing: Todo | undefined }
  ): Promise<Todo> {
    const now = nowFromProps ?? new Date();
    let toolId: string;
    let activeSession: Session;
    if (todo.id) {
      const [validSession] = await TodoManager.validateTodoId({
        check: todo.id,
        session,
      });
      activeSession = validSession;
      toolId = todo.id;
    } else {
      const [id, validSession] = await TodoManager.generateTodoId({ session });
      activeSession = validSession;
      toolId = id;
    }

    const { status, completed } = TodoManager.#resolveStatusAndCompletion(
      existing ?? {
        status: todo.status || 'pending',
        completed: false,
      },
      todo
    );
    return {
      title: todo.title ?? existing?.title ?? DEFAULT_ITEM_TITLE,
      description:
        todo.description ?? existing?.description ?? DEFAULT_ITEM_DESCRIPTION,
      priority: todo.priority ?? existing?.priority ?? 'medium',
      createdAt: now,
      updatedAt: now,
      id: toolId,
      status,
      completed,
      userId: activeSession.user!.id!,
    } satisfies Todo;
  }

  /**
   * Upsert (create or replace) a todo list.
   */
  async upsertTodoList(
    input: TodoListUpsertInput,
    { session }: { session?: Session | null } = {}
  ): Promise<TodoList | LoggedError> {
    if (!input) {
      throw new TypeError('TodoListUpsertInput is required');
    }
    const now = new Date();
    let activeSession: Session;
    let listId: string;
    let existingList: TodoList | undefined;
    if (input.id) {
      // Then validate current session has access to it
      const sessionAndId = await TodoManager.validateTodoId({
        check: input.id,
        session,
      });
      activeSession = sessionAndId[0];
      listId = sessionAndId[1];
      // Load existing list for todo item processing
      existingList = await this.storage.getTodoList(input.id);
    } else {
      const sessionAndId = await TodoManager.generateTodoId({
        session,
        salt: 'list',
      });
      activeSession = sessionAndId[1];
      listId = sessionAndId[0];
    }
    const todos = await Promise.all(
      (input.todos ?? []).map((t1) =>
        TodoManager.#todoItemUpsertInsertFactory(t1, {
          session: activeSession,
          now,
          existing: existingList?.todos.find((et: Todo) => et.id === t1.id),
        })
      )
    );
    return await this.storage.upsertTodoList({
      id: listId,
      title: input.title ?? existingList?.title ?? DEFAULT_LIST_TITLE,
      description:
        input.description ??
        existingList?.description ??
        DEFAULT_LIST_DESCRIPTION,
      status: input.status ?? existingList?.status ?? 'active',
      priority: input.priority ?? existingList?.priority ?? 'medium',
      todos: todos,
      createdAt: input.createdAt ?? existingList?.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
      userId: activeSession.user!.id,
    });
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
    const [prefix] = await TodoManager.generateTodoPrefix({
      session,
    });
    return await this.storage.getTodoLists({ completed: completed, prefix });
  }

  /**
   * Retrieve a single todo list by ID
   */
  async getTodoList(
    id: string,
    { session }: { completed?: boolean; session?: Session | null }
  ): Promise<TodoList | undefined> {
    await TodoManager.validateTodoId({ check: id, session });
    return this.storage.getTodoList(id).then((x) => x ?? undefined);
  }

  /**
   * Get all todos, optionally filtered by completion status.
   */
  async getTodos(
    completedOrOptions?:
      | boolean
      | { completed?: boolean; session?: Session | null }
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
        unauthorizedServiceResponse({
          req: undefined,
          scopes: ['mcp-tools:read'],
        })
      );
    }
    const [prefix] = await TodoManager.generateTodoPrefix({
      session: activeSession,
    });

    return this.storage.getTodos({ completed, prefix });
  }

  /**
   * Get a specific todo by ID.
   */
  async getTodo(
    id: string,
    { session }: { session?: Session | null } = {}
  ): Promise<Todo | undefined> {
    await TodoManager.validateTodoId({ check: id, session });
    return this.storage.getTodo(id).then((x) => x ?? undefined);
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
    options?: { session?: Session | null; listId?: string; list?: TodoList }
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
    // If we get here, activeSession and id are valid
    const todo = await this.storage.getTodo(id);

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
      TodoManager.#resolveStatusAndCompletion(
        todo ?? {
          status: updates.status ?? 'pending',
          completed: updates.completed || updates.status === 'complete',
        },
        updates
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
    const idx = list.todos.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list.todos[idx] = updatedTodo;
    } else {
      list.todos.push(updatedTodo);
    }
    list.updatedAt = updatedTodo.updatedAt;
    this.updateListStatus(list);

    // update in list
    await this.storage.upsertTodo(updatedTodo, { list });
    /*

    this.todoLists.set(list.id, list);
    this.todoToList.set(id, list.id);
    */

    logEvent('info', 'TODO Item Updated', {
      userId: activeSession?.user?.id ?? 'anonymous',
      itemId: id,
      listId: list.id,
    });

    return updatedTodo;
  }

  async getListIdFromTodoId(
    id: string,
    { session }: { session?: Session | null } = {}
  ): Promise<string | undefined> {
    const ret = await this.storage.getTodoToListMapping(id);
    if (ret) {
      await TodoManager.validateTodoId({ check: id, session });
    }
    return ret;
  }

  /**
   * Delete a todo by ID.
   */
  async deleteTodo(
    id: string,
    { session }: { session?: Session | null } = {}
  ): Promise<boolean> {
    try {
      // First validate we have access to this item
      const [activeSession] = await TodoManager.validateTodoId({
        check: id,
        session,
      });

      // Then, use the validated session to load the list and delete the todo item
      const listId = await this.getListIdFromTodoId(id, {
        session: activeSession,
      });
      const list = listId
        ? await this.getTodoList(listId, { session: activeSession })
        : undefined;
      const result = await this.storage.deleteTodo(id);

      // Create an audit log if deletion was successful,
      // then update the associated list to remove the todo item
      // and make any necessary status updates.
      // IMPORTANT: We do not require transactional support from
      // the storage layer, so it's possible for the todo to be deleted
      // but the list to fail to update. We accept this risk for v1.
      if (result) {
        logEvent('info', 'TODO Item deleted', {
          userId: activeSession.user?.id ?? 'anonymous',
          itemId: id,
          listId: list?.id ?? '[none]',
        });

        if (list) {
          const nextTodos = list.todos.filter((todo) => todo.id !== id);
          if (nextTodos.length !== list.todos.length) {
            list.todos = nextTodos;
            list.updatedAt = new Date();
            this.updateListStatus(list);
            await this.storage.upsertTodoList(list);
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        source: 'TodoManager.deleteTodo',
      });
      return false;
    }
  }

  /**
   * Delete a todo by ID.
   */
  async deleteTodoList(
    id: string,
    { session }: { session?: Session | null } = {}
  ): Promise<boolean> {
    try {
      // First validate we have access to this item
      await TodoManager.validateTodoId({
        check: id,
        session,
      });

      return this.storage.deleteTodoList(id);
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        source: 'TodoManager.deleteTodo',
      });
      return false;
    }
  }

  /**
   * Toggle the completed status of a todo. Optionally verify userId for authorization.
   */
  async toggleTodo(
    id: string,
    { session }: { session?: Session | null } = {}
  ): Promise<TodoList | undefined> {
    try {
      const [activeSession] = await TodoManager.validateTodoId({
        check: id,
        session,
      });

      const listId = await this.storage.getTodoToListMapping(id);
      const list = listId
        ? await this.getTodoList(listId, { session: activeSession })
        : undefined;
      const todo = await this.getTodo(id, { session: activeSession });

      // If no list exists it's an orphaned todo, just delete it
      if (!list) {
        if (todo) {
          await this.storage.deleteTodo(id);
        }
        return undefined;
      }

      // If no todo exists, just return the list as-is
      if (!todo) {
        log((l) => l.warn('Toggle requested for missing todo item', { id }));
        return list;
      }

      // Ok, we have both a list and a todo, proceed with toggling
      const { status: nextStatus, completed: nextCompleted } =
        this.advanceTodoState(todo);
      const updatedTodo: Todo = {
        ...todo,
        status: nextStatus,
        completed: nextCompleted,
        updatedAt: new Date(),
      };

      // Update our list with the updated todo, processing any status changes
      // on the way
      const idx = list.todos.findIndex((item) => item.id === id);
      if (idx !== -1) {
        list.todos[idx] = updatedTodo;
      } else {
        list.todos.push(updatedTodo);
      }
      list.updatedAt = updatedTodo.updatedAt;
      this.updateListStatus(list);

      // So my theory is that while these complicated status updates
      // are a manager concern, persisting the child todo items with
      // the list is more a storage thing, so we're going to try just
      // saving the list and see if that works out.
      await this.storage.upsertTodoList(list);

      logEvent('info', 'TODO Item toggled', {
        userId: activeSession.user?.id ?? 'anonymous',
        itemId: id,
        listId: list.id,
        status: updatedTodo.status,
        completed: updatedTodo.completed ? 'true' : 'false',
      });

      return list;
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        source: 'TodoManager.toggleTodo',
      });
      return undefined;
    }
  }

  /**
   * Clear all todos and lists for a specific user session.
   */
  async clearAll({
    session,
  }: {
    session?: Session | null;
  } = {}): Promise<boolean> {
    try {
      const [prefix, activeSession] = await TodoManager.generateTodoPrefix({
        session,
      });
      const { todosCleared, listsCleared } = await this.storage.clearAll({
        prefix,
      });

      logEvent('info', 'TODO items and lists cleared for user', {
        userId: activeSession.user?.id ?? 'anonymous',
        todosCleared,
        listsCleared,
      });
      return true;
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        source: 'TodoManager.clearAll',
      });
      return false;
    }
  }

  /**
   * Get the total count of todos across all lists.
   */
  async getCount({
    session,
  }: {
    session?: Session | null;
  } = {}): Promise<number> {
    try {
      const [prefix] = await TodoManager.generateTodoPrefix({ session });
      return await this.storage.getCount({ prefix });
    } catch (err) {
      LoggedError.isTurtlesAllTheWayDownBaby(err, {
        log: true,
        source: 'TodoManager.getCount',
      });
      return -1;
    }
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
    session?: Session | null
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
      const [id, active] = await TodoManager.generateTodoId({
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
          { status: 500 }
        )
      );
    }
    return result;
  }

  static #resolveStatusAndCompletion(
    todo: { status: TodoStatus; completed: boolean },
    updates: {
      completed?: boolean;
      status?: TodoStatus;
    }
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
        : TodoManager.inferIncompleteStatus(nextStatus);
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
    } = {}
  ): Promise<[string, Session]> {
    const activeSession = options.session ?? (await auth());
    if (!activeSession) {
      throw new ApiRequestError(
        'No session available',
        unauthorizedServiceResponse({
          req: undefined,
          scopes: ['mcp-tools:read'],
        })
      );
    }
    const userId = activeSession.user?.id;
    if (!userId) {
      throw new ApiRequestError(
        'Session does not contain user information',
        unauthorizedServiceResponse({
          req: undefined,
          scopes: ['mcp-tools:read'],
        })
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
    } = {}
  ): Promise<[string, Session]> {
    const [prefix, activeSession] = await this.generateTodoPrefix({
      session: options.session,
    });
    return [
      `${prefix}${Date.now()}${options.salt ? `:${options.salt}` : ''}-${
        options.suffix ?? Math.random().toString(36).substring(2, 9)
      }`,
      activeSession,
    ];
  }

  private static async validateTodoId(options: {
    check: string;
    session?: Session | null;
  }): Promise<[Session, string]> {
    const [prefix, activeSession] = await this.generateTodoPrefix({
      session: options.session,
    });
    const isValid = options.check.startsWith(prefix);
    if (!isValid) {
      throw new ApiRequestError(
        'User does not have access to this todo item',
        unauthorizedServiceResponse({
          req: undefined,
          scopes: ['mcp-tools:read'],
        })
      );
    }
    return [activeSession, options.check];
  }

  private static inferIncompleteStatus(previousStatus: TodoStatus): TodoStatus {
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
      { complete: 0, active: 0, pending: 0, total: 0 }
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

    const existing = await this.storage.getTodoList(listId);
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
        priority: DEFAULT_PRIORITY,
        todos: [],
        createdAt: now,
        updatedAt: now,
      },
      { session: activeSession }
    );
    // No default list is a fatal error
    if (isError(list)) {
      throw list;
    }
    return list;
  }
}

export const getTodoManager = async (
  strategy?: TodoStorageStrategy
): Promise<TodoManager> => {
  const provider = SingletonProvider.Instance;
  const managerKey = Symbol.for('@noeducation/ai/TodoManager');

  const status = await createStorageStrategyFromFlags();
  if (status.stale) {
    provider.delete(managerKey);
  }

  return await globalRequiredSingletonAsync(
    '@noeducation/ai/TodoManager',
    async () => {
      if (strategy) {
        log((l) => l.debug('TodoManager singleton instance created'));
        return new TodoManager(strategy);
      }
      const storageStrategy = await createStorageStrategy(
        status.strategy,
        status.config,
        InMemoryStorageStrategy.Instance
      );
      return new TodoManager(storageStrategy);
    },
    {
      weakRef: true,
    }
  );
};

/**
 * Reset the TodoManager singleton.
 * Useful for testing or when changing storage strategies.
 */
export const resetTodoManager = (): void => {
  SingletonProvider.Instance.delete('@noeducation/ai/TodoManager');
  log((l) => l.debug('TodoManager singleton reset'));
};

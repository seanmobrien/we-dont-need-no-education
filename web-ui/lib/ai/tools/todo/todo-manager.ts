import { log } from '/lib/logger';

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
 * TodoManager - Manages in-memory todo lists and items.
 *
 * This class provides CRUD operations for managing todos and their lists. It's
 * designed as a singleton to maintain state across multiple tool invocations
 * within the same process.
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
  createTodo(
    title: string,
    description?: string,
    options?: { status?: TodoStatus; priority?: TodoPriority },
  ): Todo {
    const list = this.ensureDefaultList();
    const todo = this.createTodoRecord(
      {
        title,
        description,
        status: options?.status,
        priority: options?.priority,
      },
      list.id,
    );

    list.todos.push(todo);
    list.updatedAt = todo.updatedAt;
    this.todos.set(todo.id, todo);
    this.todoToList.set(todo.id, list.id);

    log((l) => l.debug('Todo created', { id: todo.id, title }));

    return todo;
  }

  /**
   * Upsert (create or replace) a todo list.
   */
  upsertTodoList(input: TodoListUpsertInput): TodoList {
    const listId = input.id ?? this.generateListId();
    const now = new Date();

    const existingList = this.todoLists.get(listId);
    if (existingList) {
      existingList.todos.forEach((todo) => {
        this.todos.delete(todo.id);
        this.todoToList.delete(todo.id);
      });
    }

    const createdAt = input.createdAt ?? existingList?.createdAt ?? now;
    const todos = (input.todos ?? []).map((todoInput) =>
      this.createTodoRecord(todoInput, listId),
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

    this.todoLists.set(listId, list);
    todos.forEach((todo) => {
      this.todos.set(todo.id, todo);
      this.todoToList.set(todo.id, listId);
    });

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
  getTodoLists(options?: { completed?: boolean }): TodoList[] {
    const completed = options?.completed;
    return Array.from(this.todoLists.values()).map((list) =>
      this.cloneListWithFilter(list, completed),
    );
  }

  /**
   * Retrieve a single todo list by ID.
   */
  getTodoList(
    id: string,
    options?: { completed?: boolean },
  ): TodoList | undefined {
    const list = this.todoLists.get(id);
    if (!list) {
      return undefined;
    }
    return this.cloneListWithFilter(list, options?.completed);
  }

  /**
   * Get all todos, optionally filtered by completion status.
   */
  getTodos(completed?: boolean): Todo[] {
    const todos = Array.from(this.todos.values());
    if (completed === undefined) {
      return todos;
    }
    return todos.filter((todo) => todo.completed === completed);
  }

  /**
   * Get a specific todo by ID.
   */
  getTodo(id: string): Todo | undefined {
    return this.todos.get(id);
  }

  /**
   * Update an existing todo.
   */
  updateTodo(
    id: string,
    updates: {
      title?: string;
      description?: string;
      completed?: boolean;
      status?: TodoStatus;
      priority?: TodoPriority;
    },
  ): Todo | undefined {
    const todo = this.todos.get(id);
    if (!todo) {
      return undefined;
    }

    const listId = this.todoToList.get(id);
    const list = listId ? this.todoLists.get(listId) : undefined;
    if (!list) {
      this.todos.delete(id);
      this.todoToList.delete(id);
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

    this.todos.set(id, updatedTodo);

    const idx = list.todos.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list.todos[idx] = updatedTodo;
    } else {
      list.todos.push(updatedTodo);
    }
    list.updatedAt = updatedTodo.updatedAt;
    this.updateListStatus(list);

    log((l) => l.debug('Todo updated', { id, updates }));

    return updatedTodo;
  }

  /**
   * Delete a todo by ID.
   */
  deleteTodo(id: string): boolean {
    const listId = this.todoToList.get(id);
    const list = listId ? this.todoLists.get(listId) : undefined;

    const result = this.todos.delete(id);
    this.todoToList.delete(id);

    if (list) {
      const nextTodos = list.todos.filter((todo) => todo.id !== id);
      if (nextTodos.length !== list.todos.length) {
        list.todos = nextTodos;
        list.updatedAt = new Date();
        this.updateListStatus(list);
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
  toggleTodo(id: string): TodoList | undefined {
    const todo = this.todos.get(id);
    if (!todo) {
      return undefined;
    }

    const listId = this.todoToList.get(id);
    if (!listId) {
      this.todos.delete(id);
      this.todoToList.delete(id);
      return undefined;
    }

    const list = this.todoLists.get(listId);
    if (!list) {
      this.todos.delete(id);
      this.todoToList.delete(id);
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

    this.todos.set(id, updatedTodo);

    const idx = list.todos.findIndex((item) => item.id === id);
    if (idx !== -1) {
      list.todos[idx] = updatedTodo;
    } else {
      list.todos.push(updatedTodo);
    }

    list.updatedAt = updatedTodo.updatedAt;
    this.updateListStatus(list);

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
  clearAll(): void {
    this.todos.clear();
    this.todoLists.clear();
    this.todoToList.clear();
    log((l) => l.debug('All todos and lists cleared'));
  }

  /**
   * Get the total count of todos across all lists.
   */
  getCount(): number {
    return this.todos.size;
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
    listId: string,
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

    this.todoToList.set(id, listId);

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

  private ensureDefaultList(): TodoList {
    const existing = this.todoLists.get(DEFAULT_LIST_ID);
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

    this.todoLists.set(DEFAULT_LIST_ID, list);
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

export const resetTodoManager = (): void => {
  const globalWithTodoManager = globalThis as GlobalWithTodoManager;
  if (globalWithTodoManager[TODO_MANAGER]) {
    delete globalWithTodoManager[TODO_MANAGER];
    log((l) => l.debug('TodoManager singleton reset'));
  }
};

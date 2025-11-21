import { log } from '@/lib/logger';
import type { Todo, TodoList } from '../types';
import type { TodoStorageStrategy, StorageStrategyConfig } from './types';
import { globalSingleton, SingletonProvider } from '@/lib/typescript';

const GLOBAL_INSTANCE: symbol = Symbol.for(
  '@noeducation/ai/InMemoryStorageStrategy',
);

/**
 * In-memory storage strategy for todo-lists.
 *
 * Preserves the original behavior of TodoManager with data stored in Maps.
 * Suitable for development and single-instance deployments.
 */
export class InMemoryStorageStrategy implements TodoStorageStrategy {
  private todos: Map<string, Todo> = new Map();
  private todoLists: Map<string, TodoList> = new Map();
  private todoToList: Map<string, string> = new Map();

  static get Instance(): InMemoryStorageStrategy {
    return globalSingleton(
      GLOBAL_INSTANCE,
      () => new InMemoryStorageStrategy(),
    );
  }
  static resetInstance(): void {
    SingletonProvider.Instance.delete(GLOBAL_INSTANCE);
  }

  constructor({}: StorageStrategyConfig = {}) {
    log((l) =>
      l.warn('InMemoryStorageStrategy initialized with empty storage.'),
    );
  }

  async upsertTodoList(list: TodoList): Promise<TodoList> {
    // If this list already exists, remove its old todos first
    const existingList = this.todoLists.get(list.id);
    if (existingList) {
      existingList.todos
        .filter((todo) => !list.todos.some((t) => t.id === todo.id))
        .forEach((todo) => {
          // If the todo is completed, keep it in the list
          if (todo.completed) {
            list.todos = [todo, ...list.todos];
          } else {
            // Otherwise, remove it from storage
            this.todos.delete(todo.id);
            this.todoToList.delete(todo.id);
          }
        });
    }
    // Now set the new list and its todos
    this.todoLists.set(list.id, list);
    list.todos.forEach((todo) => {
      this.todos.set(todo.id, { ...todo });
      this.todoToList.set(todo.id, list.id);
    });
    // return the result
    return {
      ...list,
      todos: list.todos.map((todo) => ({ ...todo })),
    };
  }

  async getTodoList(
    listId: string,
    options?: { completed?: boolean },
  ): Promise<TodoList | undefined> {
    const list = this.todoLists.get(listId);
    if (!list) {
      return undefined;
    }
    // Filter todos by completion status if requested
    if (options?.completed !== undefined) {
      const filteredTodos = list.todos.filter(
        (todo) => todo.completed === options.completed,
      );
      return { ...list, todos: filteredTodos };
    }
    return list;
  }

  async getTodoLists(options?: {
    prefix: string;
    completed?: boolean;
  }): Promise<TodoList[]> {
    const lists = Array.from(this.todoLists.values())
      .filter((list) =>
        options?.prefix ? list.id.startsWith(options.prefix) : true,
      )
      .map((list) => ({ ...list }));

    if (options?.completed !== undefined) {
      return lists.map((list) => ({
        ...list,
        todos: list.todos.filter(
          (todo) => todo.completed === options.completed,
        ),
      }));
    }

    return lists;
  }

  async deleteTodoList(listId: string): Promise<boolean> {
    const list = this.todoLists.get(listId);
    if (!list) {
      return false;
    }

    // Remove all todos in this list
    list.todos.forEach((todo) => {
      this.todos.delete(todo.id);
      this.todoToList.delete(todo.id);
    });

    return this.todoLists.delete(listId);
  }

  async upsertTodo(
    todo: Todo,
    { list: listFromProps }: { list: TodoList | string },
  ): Promise<Todo> {
    let list: TodoList | undefined;
    if (typeof listFromProps === 'string') {
      list = this.todoLists.get(listFromProps);
    } else {
      list = listFromProps;
    }
    this.todos.set(todo.id, todo);
    if (!list) {
      log((l) =>
        l.warn(
          `Adding todo ${todo.id} to non-existent list ${(typeof listFromProps === 'string' ? listFromProps : listFromProps.id) ?? '[none]'}.`,
        ),
      );
      return todo;
    }
    this.todoToList.set(todo.id, list.id);
    const existingIndex = list.todos.findIndex((t) => t.id === todo.id);
    if (existingIndex !== -1) {
      list.todos[existingIndex] = todo;
    } else {
      list.todos.push(todo);
    }
    this.todoLists.set(list.id, list);
    return todo;
  }

  async getTodo(todoId: string): Promise<Todo | undefined> {
    const ret = this.todos.get(todoId);
    return ret ? { ...ret } : undefined;
  }

  async getTodos({
    completed,
    prefix,
  }: {
    completed?: boolean;
    prefix: string;
  }): Promise<Todo[]> {
    if (!prefix) {
      throw new Error('Prefix is required to get todos.');
    }
    let todos = Array.from(this.todos.values()).filter((todo) =>
      todo.id.startsWith(prefix),
    );
    if (completed !== undefined) {
      todos = todos.filter((todo) => todo.completed === completed);
    }
    return todos.map((todo) => ({ ...todo }));
  }

  async deleteTodo(todoId: string): Promise<boolean> {
    const listId = this.todoToList.get(todoId);
    const list = listId ? this.todoLists.get(listId) : undefined;

    const result = this.todos.delete(todoId);
    this.todoToList.delete(todoId);

    if (list) {
      const nextTodos = list.todos.filter((todo) => todo.id !== todoId);
      if (nextTodos.length !== list.todos.length) {
        list.todos = nextTodos;
      }
    }

    return result;
  }

  async getTodoToListMapping(todoId: string): Promise<string | undefined> {
    return this.todoToList.get(todoId);
  }

  async getCount({ prefix }: { prefix: string }): Promise<number> {
    return Array.from(this.todos.keys()).filter((todoId) =>
      todoId.startsWith(prefix),
    ).length;
  }

  clearAll({ prefix }: { prefix: string }): Promise<{
    todosCleared: number;
    listsCleared: number;
    matchesCleared: number;
  }> {
    const clearMatches = <TTarget>(target: Map<string, TTarget>) => {
      const removed: Array<TTarget> = [];
      for (const key of target.keys()) {
        if (!prefix || key.startsWith(prefix)) {
          removed.push(target.get(key)!);
          target.delete(key);
        }
      }
      return removed;
    };
    const todosCleared = clearMatches(this.todos).length;
    const listsCleared = clearMatches(this.todoLists).length;
    const matchesCleared = clearMatches(this.todoToList).length;
    return Promise.resolve({ todosCleared, listsCleared, matchesCleared });
  }

  equals(other: TodoStorageStrategy): boolean {
    if (!(other instanceof InMemoryStorageStrategy)) {
      return false;
    }
    return true;
  }
}

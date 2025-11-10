import type { Todo, TodoList } from '../todo-manager';
import type { TodoStorageStrategy, StorageStrategyConfig } from './types';

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
  private config: StorageStrategyConfig;

  constructor(config: StorageStrategyConfig = {}) {
    this.config = config;
  }

  async upsertTodoList(list: TodoList): Promise<void> {
    // If this list already exists, remove its old todos first
    const existingList = this.todoLists.get(list.id);
    if (existingList) {
      existingList.todos.forEach((todo) => {
        this.todos.delete(todo.id);
        this.todoToList.delete(todo.id);
      });
    }

    // Now set the new list and its todos
    this.todoLists.set(list.id, list);
    list.todos.forEach((todo) => {
      this.todos.set(todo.id, todo);
      this.todoToList.set(todo.id, list.id);
    });
  }

  async getTodoList(
    listId: string,
    userId?: string,
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

  async getTodoLists(
    userId?: string,
    options?: { completed?: boolean },
  ): Promise<TodoList[]> {
    const lists = Array.from(this.todoLists.values());

    if (options?.completed !== undefined) {
      return lists.map((list) => ({
        ...list,
        todos: list.todos.filter((todo) => todo.completed === options.completed),
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

  async upsertTodo(todo: Todo, listId: string): Promise<void> {
    this.todos.set(todo.id, todo);
    this.todoToList.set(todo.id, listId);

    // Update the list's todos array
    const list = this.todoLists.get(listId);
    if (list) {
      const existingIndex = list.todos.findIndex((t) => t.id === todo.id);
      if (existingIndex !== -1) {
        list.todos[existingIndex] = todo;
      } else {
        list.todos.push(todo);
      }
    }
  }

  async getTodo(todoId: string): Promise<Todo | undefined> {
    return this.todos.get(todoId);
  }

  async getTodos(userId?: string, completed?: boolean): Promise<Todo[]> {
    const todos = Array.from(this.todos.values());

    if (completed !== undefined) {
      return todos.filter((todo) => todo.completed === completed);
    }

    return todos;
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

  async getCount(): Promise<number> {
    return this.todos.size;
  }

  async clearAll(): Promise<void> {
    this.todos.clear();
    this.todoLists.clear();
    this.todoToList.clear();
  }
}

import { log } from '/lib/logger';

/**
 * Represents a single todo item in the system.
 */
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TodoManager - Manages an in-memory list of todo items.
 * 
 * This class provides CRUD operations for managing todos. It's designed as a 
 * singleton to maintain state across multiple tool invocations within the 
 * same process.
 */
export class TodoManager {
  private todos: Map<string, Todo> = new Map();

  constructor() {
    log((l) => l.debug('TodoManager instance created'));
  }

  /**
   * Create a new todo item.
   * @param title - The title of the todo
   * @param description - Optional description
   * @returns The created todo item
   */
  createTodo(title: string, description?: string): Todo {
    const id = `todo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    
    const todo: Todo = {
      id,
      title,
      description,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    this.todos.set(id, todo);
    
    log((l) => l.debug('Todo created', { id, title }));
    
    return todo;
  }

  /**
   * Get all todos, optionally filtered by completion status.
   * @param completed - Optional filter for completed status
   * @returns Array of todos
   */
  getTodos(completed?: boolean): Todo[] {
    const allTodos = Array.from(this.todos.values());
    
    if (completed === undefined) {
      return allTodos;
    }
    
    return allTodos.filter(todo => todo.completed === completed);
  }

  /**
   * Get a specific todo by ID.
   * @param id - The todo ID
   * @returns The todo if found, undefined otherwise
   */
  getTodo(id: string): Todo | undefined {
    return this.todos.get(id);
  }

  /**
   * Update an existing todo.
   * @param id - The todo ID
   * @param updates - Partial updates to apply
   * @returns The updated todo if found, undefined otherwise
   */
  updateTodo(
    id: string,
    updates: { title?: string; description?: string; completed?: boolean }
  ): Todo | undefined {
    const todo = this.todos.get(id);
    
    if (!todo) {
      return undefined;
    }

    const updatedTodo: Todo = {
      ...todo,
      ...updates,
      updatedAt: new Date(),
    };

    this.todos.set(id, updatedTodo);
    
    log((l) => l.debug('Todo updated', { id, updates }));
    
    return updatedTodo;
  }

  /**
   * Delete a todo by ID.
   * @param id - The todo ID
   * @returns true if deleted, false if not found
   */
  deleteTodo(id: string): boolean {
    const result = this.todos.delete(id);
    
    if (result) {
      log((l) => l.debug('Todo deleted', { id }));
    }
    
    return result;
  }

  /**
   * Toggle the completed status of a todo.
   * @param id - The todo ID
   * @returns The updated todo if found, undefined otherwise
   */
  toggleTodo(id: string): Todo | undefined {
    const todo = this.todos.get(id);
    
    if (!todo) {
      return undefined;
    }

    return this.updateTodo(id, { completed: !todo.completed });
  }

  /**
   * Clear all todos.
   */
  clearAll(): void {
    this.todos.clear();
    log((l) => l.debug('All todos cleared'));
  }

  /**
   * Get the total count of todos.
   * @returns Total number of todos
   */
  getCount(): number {
    return this.todos.size;
  }
}

// Singleton instance
let todoManagerInstance: TodoManager | undefined = undefined;

/**
 * Get the singleton TodoManager instance.
 * @returns The TodoManager singleton
 */
export function getTodoManager(): TodoManager {
  if (!todoManagerInstance) {
    todoManagerInstance = new TodoManager();
  }
  return todoManagerInstance;
}

/**
 * Type definitions for todo list UI components
 * @module components/todo/types
 */

declare module '@/components/todo/types' {
  /**
   * Todo status
   */
  export type TodoStatus = 'pending' | 'active' | 'complete';

  /**
   * Todo priority
   */
  export type TodoPriority = 'high' | 'medium' | 'low';

  /**
   * Todo item returned from API
   */
  export interface TodoItem {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    status: TodoStatus;
    priority: TodoPriority;
    createdAt: string;
    updatedAt: string;
  }

  /**
   * Todo list returned from API
   */
  export interface TodoList {
    id: string;
    title: string;
    description?: string;
    status: TodoStatus;
    priority: TodoPriority;
    todos: TodoItem[];
    createdAt: string;
    updatedAt: string;
  }

  /**
   * Response from GET /api/todo/lists
   */
  export interface TodoListsResponse {
    lists: TodoList[];
  }
}

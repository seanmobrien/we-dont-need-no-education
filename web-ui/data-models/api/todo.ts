/**
 * Data models for Todo List and Todo Item API responses
 */

export type TodoStatus = 'pending' | 'active' | 'complete';
export type TodoPriority = 'high' | 'medium' | 'low';

/**
 * Todo Item data model for API responses
 */
export interface TodoItem {
  itemId: string;
  listId: string;
  title: string;
  description?: string;
  completed: boolean;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Todo List data model for API responses
 */
export interface TodoList {
  listId: string;
  userId: number;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Todo List Summary with item counts
 */
export interface TodoListSummary extends TodoList {
  totalItems?: number;
  completedItems?: number;
  pendingItems?: number;
}

/**
 * Todo List with Items
 */
export interface TodoListWithItems extends TodoList {
  items: TodoItem[];
}

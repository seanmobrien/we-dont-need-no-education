/**
 * Data models for Todo List and Todo Item API responses
 * Re-exports from TodoManager for consistency
 */

export type {
  TodoStatus,
  TodoPriority,
  Todo,
  TodoList,
} from '@/lib/ai/tools/todo/todo-manager';

/**
 * Todo List Summary with item counts
 */
export interface TodoListSummary {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'complete';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
  totalItems?: number;
  completedItems?: number;
  pendingItems?: number;
}

// Alias for TodoList for compatibility - TodoList already has todos array
export type { TodoList as TodoListWithItems } from '@/lib/ai/tools/todo/todo-manager';

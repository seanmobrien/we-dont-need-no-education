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

export type TodoUpsertInsert = Partial<Omit<Todo, 'userId' | 'title'>> & {
  title: string;
};

export type TodoListUpsertInput = {
  id?: string;
  title: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  createdAt?: Date;
  updatedAt?: Date;
  todos?: Array<TodoUpsertInsert>;
};

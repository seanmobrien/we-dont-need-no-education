import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Todo, TodoList, TodoListSummary } from '@/data-models/api/todo';

import { LoggedError } from '@/lib/react-util';

// Query keys for todo-related queries
export const todoKeys = {
  all: ['todo'] as const,
  lists: () => [...todoKeys.all, 'lists'] as const,
  list: (id: string) => [...todoKeys.all, 'list', id] as const,
  items: (listId: string) => [...todoKeys.all, 'items', listId] as const,
};

/**
 * Hook to fetch all todo lists for the current user
 */
export const useTodoLists = (options?: {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}) => {
  return useQuery({
    queryKey: todoKeys.lists(),
    queryFn: async (): Promise<TodoListSummary[]> => {
      try {
        const response = await fetch('/api/todo-lists');
        if (!response.ok) {
          throw new Error(`Failed to fetch todo lists: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data || [];
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useTodoLists',
        });
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30 * 1000, // 30 seconds
    gcTime: options?.gcTime ?? 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a specific todo list with its items
 */
export const useTodoList = (
  listId: string | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  },
) => {
  return useQuery({
    queryKey: listId ? todoKeys.list(listId) : [],
    queryFn: async (): Promise<TodoList> => {
      if (!listId) {
        throw new Error('List ID is required');
      }

      try {
        const response = await fetch(`/api/todo-lists/${listId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch todo list: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data;
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useTodoList',
          data: { listId },
        });
      }
    },
    enabled: !!listId && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 30 * 1000, // 30 seconds
    gcTime: options?.gcTime ?? 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to create a new todo list
 */
export const useCreateTodoList = (options?: {
  onSuccess?: (data: TodoList) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      status?: 'pending' | 'active' | 'complete';
      priority?: 'high' | 'medium' | 'low';
    }): Promise<TodoList> => {
      try {
        const response = await fetch('/api/todo-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create todo list');
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useCreateTodoList',
          data,
        });
      }
    },
    onSuccess: (data) => {
      // Invalidate lists query to refresh the list
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook to update an existing todo list
 */
export const useUpdateTodoList = (options?: {
  onSuccess?: (data: TodoList) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listId: string;
      title?: string;
      description?: string;
      status?: 'pending' | 'active' | 'complete';
      priority?: 'high' | 'medium' | 'low';
    }): Promise<TodoList> => {
      try {
        const response = await fetch('/api/todo-lists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update todo list');
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useUpdateTodoList',
          data,
        });
      }
    },
    onSuccess: (data) => {
      // Update the specific list cache
      queryClient.setQueryData(todoKeys.list(data.id), data);
      // Invalidate lists query to refresh the list
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook to delete a todo list
 */
export const useDeleteTodoList = (options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string): Promise<void> => {
      try {
        const response = await fetch('/api/todo-lists', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete todo list');
        }
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useDeleteTodoList',
          data: { listId },
        });
      }
    },
    onSuccess: (_, listId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: todoKeys.list(listId) });
      // Invalidate lists query
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook to create a new todo item
 */
export const useCreateTodoItem = (
  listId: string,
  options?: {
    onSuccess?: (data: Todo) => void;
    onError?: (error: unknown) => void;
  },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      completed?: boolean;
      status?: 'pending' | 'active' | 'complete';
      priority?: 'high' | 'medium' | 'low';
    }): Promise<Todo> => {
      try {
        const response = await fetch(`/api/todo-lists/${listId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create todo item');
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useCreateTodoItem',
          data: { listId, ...data },
        });
      }
    },
    onSuccess: (data) => {
      // Invalidate list query to refresh items
      queryClient.invalidateQueries({ queryKey: todoKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook to update an existing todo item
 */
export const useUpdateTodoItem = (
  listId: string,
  options?: {
    onSuccess?: (data: Todo) => void;
    onError?: (error: unknown) => void;
  },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      itemId: string;
      title?: string;
      description?: string;
      completed?: boolean;
      status?: 'pending' | 'active' | 'complete';
      priority?: 'high' | 'medium' | 'low';
    }): Promise<Todo> => {
      try {
        const response = await fetch(`/api/todo-lists/${listId}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update todo item');
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useUpdateTodoItem',
          data: { listId, ...data },
        });
      }
    },
    onSuccess: (data) => {
      // Invalidate list query to refresh items
      queryClient.invalidateQueries({ queryKey: todoKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Hook to delete a todo item
 */
export const useDeleteTodoItem = (
  listId: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
  },
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/todo-lists/${listId}/items`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete todo item');
        }
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useDeleteTodoItem',
          data: { listId, itemId },
        });
      }
    },
    onSuccess: () => {
      // Invalidate list query to refresh items
      queryClient.invalidateQueries({ queryKey: todoKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

/**
 * Toggle todo item completion with optimistic updates
 */
export const useToggleTodo = (listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      completed,
    }: {
      itemId: string;
      completed: boolean;
    }): Promise<Todo> => {
      try {
        const response = await fetch(`/api/todo-lists/${listId}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            completed,
            status: completed ? 'complete' : 'active',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update todo item');
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'useToggleTodo',
          data: { listId, itemId, completed },
        });
      }
    },
    onMutate: async ({ itemId, completed }) => {
      // Cancel outgoing refetches for this list and all lists
      await queryClient.cancelQueries({ queryKey: todoKeys.list(listId) });
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });

      // Snapshot previous values
      const previousList = queryClient.getQueryData<TodoList>(
        todoKeys.list(listId),
      );
      const previousLists = queryClient.getQueryData<TodoListSummary[]>(
        todoKeys.lists(),
      );

      // Optimistically update the specific list
      if (previousList) {
        queryClient.setQueryData<TodoList>(todoKeys.list(listId), {
          ...previousList,
          todos: previousList.todos.map((todo) =>
            todo.id === itemId
              ? {
                  ...todo,
                  completed,
                  status: completed ? 'complete' : 'active',
                }
              : todo,
          ),
        });
      }

      // Optimistically update the lists summary
      if (previousLists) {
        queryClient.setQueryData<TodoListSummary[]>(
          todoKeys.lists(),
          previousLists.map((list) =>
            list.id === listId
              ? {
                  ...list,
                  completedItems: completed
                    ? (list.completedItems ?? 0) + 1
                    : (list.completedItems ?? 0) - 1,
                  pendingItems: completed
                    ? (list.pendingItems ?? 0) - 1
                    : (list.pendingItems ?? 0) + 1,
                }
              : list,
          ),
        );
      }

      return { previousList, previousLists };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(todoKeys.list(listId), context.previousList);
      }
      if (context?.previousLists) {
        queryClient.setQueryData(todoKeys.lists(), context.previousLists);
      }
    },
    onSettled: () => {
      // Refetch after mutation to ensure consistency
      queryClient.invalidateQueries({ queryKey: todoKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
};

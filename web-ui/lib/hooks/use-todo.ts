import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  TodoList,
  TodoListSummary,
  TodoListWithItems,
  TodoItem,
} from '@/data-models/api/todo';
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
    queryFn: async (): Promise<TodoListWithItems> => {
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
    onSuccess?: (data: TodoItem) => void;
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
    }): Promise<TodoItem> => {
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
    onSuccess?: (data: TodoItem) => void;
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
    }): Promise<TodoItem> => {
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

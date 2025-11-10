import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TodoList, TodoListsResponse, TodoItem } from '@/components/todo/types';

/**
 * Fetch all todo lists
 */
export const useTodoLists = (options?: { completed?: boolean }) => {
  return useQuery<TodoListsResponse>({
    queryKey: ['todoLists', options?.completed],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.completed !== undefined) {
        params.append('completed', String(options.completed));
      }
      const response = await fetch(`/api/todo/lists?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch todo lists');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Fetch a specific todo list
 */
export const useTodoList = (id: string | null, options?: { completed?: boolean }) => {
  return useQuery<TodoList>({
    queryKey: ['todoList', id, options?.completed],
    queryFn: async () => {
      if (!id) {
        throw new Error('List ID is required');
      }
      const params = new URLSearchParams();
      if (options?.completed !== undefined) {
        params.append('completed', String(options.completed));
      }
      const response = await fetch(`/api/todo/lists/${id}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch todo list');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Toggle todo item completion with optimistic updates
 */
export const useToggleTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const response = await fetch(`/api/todo/items/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update todo');
      }

      return response.json() as Promise<TodoItem>;
    },
    onMutate: async ({ id, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todoLists'] });
      await queryClient.cancelQueries({ queryKey: ['todoList'] });

      // Snapshot previous values
      const previousLists = queryClient.getQueryData<TodoListsResponse>(['todoLists', undefined]);
      const previousListsCompleted = queryClient.getQueryData<TodoListsResponse>(['todoLists', true]);
      const previousListsIncomplete = queryClient.getQueryData<TodoListsResponse>(['todoLists', false]);

      // Optimistically update all relevant queries
      if (previousLists) {
        queryClient.setQueryData<TodoListsResponse>(['todoLists', undefined], {
          lists: previousLists.lists.map(list => ({
            ...list,
            todos: list.todos.map(todo =>
              todo.id === id ? { ...todo, completed } : todo
            ),
          })),
        });
      }

      if (previousListsCompleted) {
        queryClient.setQueryData<TodoListsResponse>(['todoLists', true], {
          lists: previousListsCompleted.lists.map(list => ({
            ...list,
            todos: list.todos.map(todo =>
              todo.id === id ? { ...todo, completed } : todo
            ),
          })),
        });
      }

      if (previousListsIncomplete) {
        queryClient.setQueryData<TodoListsResponse>(['todoLists', false], {
          lists: previousListsIncomplete.lists.map(list => ({
            ...list,
            todos: list.todos.map(todo =>
              todo.id === id ? { ...todo, completed } : todo
            ),
          })),
        });
      }

      return { previousLists, previousListsCompleted, previousListsIncomplete };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousLists) {
        queryClient.setQueryData(['todoLists', undefined], context.previousLists);
      }
      if (context?.previousListsCompleted) {
        queryClient.setQueryData(['todoLists', true], context.previousListsCompleted);
      }
      if (context?.previousListsIncomplete) {
        queryClient.setQueryData(['todoLists', false], context.previousListsIncomplete);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['todoLists'] });
      queryClient.invalidateQueries({ queryKey: ['todoList'] });
    },
  });
};

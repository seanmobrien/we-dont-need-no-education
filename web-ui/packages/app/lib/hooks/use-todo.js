import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetch } from '@/lib/nextjs-util';
import { LoggedError } from '@compliance-theater/logger';
export const todoKeys = {
    all: ['todo'],
    lists: () => [...todoKeys.all, 'lists'],
    list: (id) => [...todoKeys.all, 'list', id],
    items: (listId) => [...todoKeys.all, 'items', listId],
};
export const useTodoLists = (options) => {
    return useQuery({
        queryKey: todoKeys.lists(),
        queryFn: async () => {
            try {
                const response = await fetch('/api/todo-lists');
                if (!response.ok) {
                    throw new Error(`Failed to fetch todo lists: ${response.statusText}`);
                }
                const result = await response.json();
                return result.data || [];
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useTodoLists',
                });
            }
        },
        enabled: options?.enabled ?? true,
        staleTime: options?.staleTime ?? 30 * 1000,
        gcTime: options?.gcTime ?? 5 * 60 * 1000,
    });
};
export const useTodoList = (listId, options) => {
    return useQuery({
        queryKey: listId ? todoKeys.list(listId) : [],
        queryFn: async () => {
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
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useTodoList',
                    data: { listId },
                });
            }
        },
        enabled: !!listId && (options?.enabled ?? true),
        staleTime: options?.staleTime ?? 30 * 1000,
        gcTime: options?.gcTime ?? 5 * 60 * 1000,
    });
};
export const useCreateTodoList = (options) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
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
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useCreateTodoList',
                    data,
                });
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
            options?.onSuccess?.(data);
        },
        onError: (error) => {
            options?.onError?.(error);
        },
    });
};
export const useUpdateTodoList = (options) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
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
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useUpdateTodoList',
                    data,
                });
            }
        },
        onSuccess: (data) => {
            queryClient.setQueryData(todoKeys.list(data.id), data);
            queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
            options?.onSuccess?.(data);
        },
        onError: (error) => {
            options?.onError?.(error);
        },
    });
};
export const useDeleteTodoList = (options) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (listId) => {
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
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useDeleteTodoList',
                    data: { listId },
                });
            }
        },
        onSuccess: (_, listId) => {
            queryClient.removeQueries({ queryKey: todoKeys.list(listId) });
            queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
            options?.onSuccess?.();
        },
        onError: (error) => {
            options?.onError?.(error);
        },
    });
};
export const useCreateTodoItem = (listId, options) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
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
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useCreateTodoItem',
                    data: { listId, ...data },
                });
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: todoKeys.list(listId) });
            queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
            options?.onSuccess?.(data);
        },
        onError: (error) => {
            options?.onError?.(error);
        },
    });
};
export const useUpdateTodoItem = (listId, options) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
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
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useUpdateTodoItem',
                    data: { listId, ...data },
                });
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: todoKeys.list(listId) });
            queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
            options?.onSuccess?.(data);
        },
        onError: (error) => {
            options?.onError?.(error);
        },
    });
};
export const useDeleteTodoItem = (listId, options) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (itemId) => {
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
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useDeleteTodoItem',
                    data: { listId, itemId },
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: todoKeys.list(listId) });
            queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
            options?.onSuccess?.();
        },
        onError: (error) => {
            options?.onError?.(error);
        },
    });
};
export const useToggleTodo = (listId) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ itemId, completed, }) => {
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
            }
            catch (error) {
                throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'useToggleTodo',
                    data: { listId, itemId, completed },
                });
            }
        },
        onMutate: async ({ itemId, completed }) => {
            await queryClient.cancelQueries({ queryKey: todoKeys.list(listId) });
            await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
            const previousList = queryClient.getQueryData(todoKeys.list(listId));
            const previousLists = queryClient.getQueryData(todoKeys.lists());
            if (previousList) {
                queryClient.setQueryData(todoKeys.list(listId), {
                    ...previousList,
                    todos: previousList.todos.map((todo) => todo.id === itemId
                        ? {
                            ...todo,
                            completed,
                            status: completed ? 'complete' : 'active',
                        }
                        : todo),
                });
            }
            if (previousLists) {
                queryClient.setQueryData(todoKeys.lists(), previousLists.map((list) => list.id === listId
                    ? {
                        ...list,
                        completedItems: completed
                            ? (list.completedItems ?? 0) + 1
                            : (list.completedItems ?? 0) - 1,
                        pendingItems: completed
                            ? (list.pendingItems ?? 0) - 1
                            : (list.pendingItems ?? 0) + 1,
                    }
                    : list));
            }
            return { previousList, previousLists };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousList) {
                queryClient.setQueryData(todoKeys.list(listId), context.previousList);
            }
            if (context?.previousLists) {
                queryClient.setQueryData(todoKeys.lists(), context.previousLists);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: todoKeys.list(listId) });
            queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
        },
    });
};
//# sourceMappingURL=use-todo.js.map
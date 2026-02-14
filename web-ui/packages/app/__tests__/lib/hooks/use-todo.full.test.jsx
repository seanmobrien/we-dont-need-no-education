let testQueryClient;
import React from 'react';
import { renderHook, waitFor, act, jsonResponse, hideConsoleOutput, } from '@/__tests__/test-utils';
import { QueryClient, QueryClientProvider, useQueryClient, } from '@tanstack/react-query';
import { fetch } from '@/lib/nextjs-util';
const loadHooks = () => {
    jest.unmock('@/lib/hooks/use-todo');
    const hooks = require('@/lib/hooks/use-todo');
    return hooks;
};
describe('use-todo real implementation', () => {
    let mockFetch;
    beforeEach(() => {
        mockFetch = fetch;
    });
    const TestWrapper = ({ children, }) => {
        if (!testQueryClient) {
            testQueryClient = jest.fn(() => new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                },
            }))();
        }
        const client = testQueryClient;
        return (<QueryClientProvider client={client}>{children}</QueryClientProvider>);
    };
    afterEach(() => {
        testQueryClient = undefined;
    });
    it('useTodoLists returns data on success', async () => {
        const hooks = loadHooks();
        const { useTodoLists } = hooks;
        const mockData = [{ id: 'l1', title: 'List 1' }];
        mockFetch.mockResolvedValue(jsonResponse({ data: mockData }));
        const { result } = renderHook(() => useTodoLists(), {
            wrapper: TestWrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockData);
        expect(mockFetch.mock.calls[0][0]).toBe('/api/todo-lists');
    }, 10000);
    it('useTodoLists surfaces error on failure', async () => {
        hideConsoleOutput().setup();
        const hooks = loadHooks();
        const { useTodoLists } = hooks;
        mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'bad' }, 500));
        const { result } = renderHook(() => useTodoLists(), {
            wrapper: TestWrapper,
        });
        await waitFor(() => expect(result.current.isError).toBe(true), {
            timeout: 2000,
        });
    }, 10000);
    it('useTodoList disabled when listId is null', async () => {
        const hooks = loadHooks();
        const { useTodoList } = hooks;
        const { result } = renderHook(() => useTodoList(null), {
            wrapper: TestWrapper,
        });
        expect(result.current.isLoading).toBe(false);
    }, 10000);
    it('useTodoList fetches single list successfully', async () => {
        const hooks = loadHooks();
        const { useTodoList } = hooks;
        const payload = { id: 'list-1', title: 'T1', todos: [] };
        mockFetch.mockResolvedValueOnce(jsonResponse({ data: payload }));
        const { result } = renderHook(() => useTodoList('list-1'), {
            wrapper: TestWrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(payload);
    }, 10000);
    it('mutations: create/update/delete list and items return expected results', async () => {
        const hooks = loadHooks();
        const { useCreateTodoList, useUpdateTodoList, useDeleteTodoList, useCreateTodoItem, useUpdateTodoItem, useDeleteTodoItem, } = hooks;
        const created = { id: 'new', title: 'New List' };
        mockFetch.mockResolvedValue(jsonResponse({ data: created }));
        const { result: createResult } = renderHook(() => useCreateTodoList(), {
            wrapper: TestWrapper,
        });
        await act(async () => {
            const res = await createResult.current.mutateAsync({ title: 'New List' });
            expect(res).toEqual(created);
        });
        const updated = { id: 'new', title: 'Updated' };
        mockFetch.mockResolvedValue(jsonResponse({ data: updated }));
        const { result: updateResult } = renderHook(() => useUpdateTodoList(), {
            wrapper: TestWrapper,
        });
        await act(async () => {
            const res = await updateResult.current.mutateAsync({
                listId: 'new',
                title: 'Updated',
            });
            expect(res).toEqual(updated);
        });
        mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
        const { result: deleteResult } = renderHook(() => useDeleteTodoList(), {
            wrapper: TestWrapper,
        });
        await act(async () => {
            await deleteResult.current.mutateAsync('new');
        });
        const createdItem = { id: 'i1', title: 'Item 1' };
        mockFetch.mockResolvedValue(jsonResponse({ data: createdItem }));
        const { result: createItemResult } = renderHook(() => useCreateTodoItem('list-1'), {
            wrapper: TestWrapper,
        });
        await act(async () => {
            const res = await createItemResult.current.mutateAsync({
                title: 'Item 1',
            });
            expect(res).toEqual(createdItem);
        });
        const updatedItem = { id: 'i1', title: 'Item 1 updated' };
        mockFetch.mockResolvedValue(jsonResponse({ data: updatedItem }));
        const { result: updateItemResult } = renderHook(() => useUpdateTodoItem('list-1'));
        await act(async () => {
            const res = await updateItemResult.current.mutateAsync({
                itemId: 'i1',
                title: 'Item 1 updated',
            });
            expect(res).toEqual(updatedItem);
        });
        mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
        const { result: deleteItemResult } = renderHook(() => useDeleteTodoItem('list-1'), {
            wrapper: TestWrapper,
        });
        await act(async () => {
            await deleteItemResult.current.mutateAsync('i1');
        });
    }, 10000);
    it('useToggleTodo optimistic update and rollback on error', async () => {
        hideConsoleOutput().setup();
        const hooks = loadHooks();
        const { useToggleTodo, todoKeys } = hooks;
        const listId = 'list-x';
        const originalList = {
            id: listId,
            title: 'Seeded',
            todos: [{ id: 't1', title: 'T1', completed: false }],
        };
        const originalLists = [
            {
                id: listId,
                title: 'Seeded',
                totalItems: 1,
                completedItems: 0,
                pendingItems: 1,
            },
        ];
        renderHook(() => {
            const qc = useQueryClient();
            React.useEffect(() => {
                qc.setQueryData(todoKeys.list(listId), originalList);
                qc.setQueryData(todoKeys.lists(), originalLists);
            }, [qc]);
            return null;
        }, {
            wrapper: TestWrapper,
        });
        mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: 't1', completed: true } }));
        const { result: toggleResult } = renderHook(() => useToggleTodo(listId), {
            wrapper: TestWrapper,
        });
        await act(async () => {
            await toggleResult.current.mutateAsync({ itemId: 't1', completed: true });
        });
        const after = renderHook(() => {
            const qc = useQueryClient();
            return qc.getQueryData(todoKeys.list(listId));
        }, {
            wrapper: TestWrapper,
        });
        expect(after.result.current.todos.find((t) => t.id === 't1')
            .completed).toBe(true);
        renderHook(() => {
            const qc = useQueryClient();
            React.useEffect(() => {
                qc.setQueryData(todoKeys.list(listId), originalList);
                qc.setQueryData(todoKeys.lists(), originalLists);
            }, [qc]);
            return null;
        }, {
            wrapper: TestWrapper,
        });
        mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'fail' }, 500));
        const { result: toggleResultFail } = renderHook(() => useToggleTodo(listId), {
            wrapper: TestWrapper,
        });
        await act(async () => {
            await expect(toggleResultFail.current.mutateAsync({ itemId: 't1', completed: true })).rejects.toBeTruthy();
        });
        const rolled = renderHook(() => {
            const qc = useQueryClient();
            return qc.getQueryData(todoKeys.list(listId));
        }, { wrapper: TestWrapper });
        expect(rolled.result.current.todos.find((t) => t.id === 't1')
            .completed).toBe(false);
    }, 10000);
});
//# sourceMappingURL=use-todo.full.test.jsx.map
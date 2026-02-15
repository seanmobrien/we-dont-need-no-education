/**
 * @jest-environment jsdom
 */
let testQueryClient: QueryClient | undefined;

import React, { JSX, PropsWithChildren } from 'react';
import {
  renderHook,
  waitFor,
  act,
  jsonResponse,
  hideConsoleOutput,
} from '@/__tests__/test-utils';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { fetch } from '@compliance-theater/nextjs';

// Load the real hooks inside isolated modules after unmocking the global mock
const loadHooks = () => {
  // Load the real hooks module without isolating modules so it shares
  // the same `@tanstack/react-query` instance used by the test wrapper.
  jest.unmock('@/lib/hooks/use-todo');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const hooks = require('@/lib/hooks/use-todo');
  return hooks;
};

describe('use-todo real implementation', () => {
  let mockFetch: jest.Mock;
  beforeEach(() => {
    mockFetch = fetch as jest.Mock;
  });
  // Create a test query client and wrapper
  const TestWrapper = ({
    children,
  }: PropsWithChildren<object>): JSX.Element => {
    if (!testQueryClient) {
      testQueryClient = jest.fn(
        () =>
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
            },
          }),
      )();
    }
    const client = testQueryClient;
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };

  afterEach(() => {
    // jest.restoreAllMocks();
    // jest.resetModules();
    // Reset the shared test QueryClient so each test gets a fresh cache
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

    // Query should be idle/disabled
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
    const {
      useCreateTodoList,
      useUpdateTodoList,
      useDeleteTodoList,
      useCreateTodoItem,
      useUpdateTodoItem,
      useDeleteTodoItem,
    } = hooks;

    // create list
    const created = { id: 'new', title: 'New List' };
    mockFetch.mockResolvedValue(jsonResponse({ data: created }));
    const { result: createResult } = renderHook(() => useCreateTodoList(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      const res = await createResult.current.mutateAsync({ title: 'New List' });
      expect(res).toEqual(created);
    });

    // update list
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

    // delete list
    mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
    const { result: deleteResult } = renderHook(() => useDeleteTodoList(), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      await deleteResult.current.mutateAsync('new');
    });

    // create item
    const createdItem = { id: 'i1', title: 'Item 1' };
    mockFetch.mockResolvedValue(jsonResponse({ data: createdItem }));
    const { result: createItemResult } = renderHook(
      () => useCreateTodoItem('list-1'),
      {
        wrapper: TestWrapper,
      },
    );

    await act(async () => {
      const res = await createItemResult.current.mutateAsync({
        title: 'Item 1',
      });
      expect(res).toEqual(createdItem);
    });

    // update item
    const updatedItem = { id: 'i1', title: 'Item 1 updated' };
    mockFetch.mockResolvedValue(jsonResponse({ data: updatedItem }));
    const { result: updateItemResult } = renderHook(() =>
      useUpdateTodoItem('list-1'),
    );

    await act(async () => {
      const res = await updateItemResult.current.mutateAsync({
        itemId: 'i1',
        title: 'Item 1 updated',
      });
      expect(res).toEqual(updatedItem);
    });

    // delete item
    mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
    const { result: deleteItemResult } = renderHook(
      () => useDeleteTodoItem('list-1'),
      {
        wrapper: TestWrapper,
      },
    );

    await act(async () => {
      await deleteItemResult.current.mutateAsync('i1');
    });
  }, 10000);

  it('useToggleTodo optimistic update and rollback on error', async () => {
    hideConsoleOutput().setup();
    const hooks = loadHooks();
    const { useToggleTodo, todoKeys } = hooks;

    const listId = 'list-x';
    // seed cache with a list and lists summary using the test wrapper's QueryClient
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

    // Render a small hook to seed the shared QueryClient used by the test wrapper
    renderHook(
      () => {
        const qc = useQueryClient();
        React.useEffect(() => {
          qc.setQueryData(todoKeys.list(listId), originalList);
          qc.setQueryData(todoKeys.lists(), originalLists);
        }, [qc]);
        return null;
      },
      {
        wrapper: TestWrapper,
      },
    );

    // First, server success -> final state should be completed true
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: { id: 't1', completed: true } }),
    );

    const { result: toggleResult } = renderHook(() => useToggleTodo(listId), {
      wrapper: TestWrapper,
    });

    await act(async () => {
      await toggleResult.current.mutateAsync({ itemId: 't1', completed: true });
    });

    // read cache from shared QueryClient
    const after = renderHook(
      () => {
        const qc = useQueryClient();
        return qc.getQueryData(todoKeys.list(listId));
      },
      {
        wrapper: TestWrapper,
      },
    );
    expect(
      (after.result.current as any).todos.find((t: any) => t.id === 't1')
        .completed,
    ).toBe(true);

    // Now simulate server error to ensure rollback
    renderHook(
      () => {
        const qc = useQueryClient();
        React.useEffect(() => {
          qc.setQueryData(todoKeys.list(listId), originalList);
          qc.setQueryData(todoKeys.lists(), originalLists);
        }, [qc]);
        return null;
      },
      {
        wrapper: TestWrapper,
      },
    );

    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'fail' }, 500));
    const { result: toggleResultFail } = renderHook(
      () => useToggleTodo(listId),
      {
        wrapper: TestWrapper,
      },
    );

    await act(async () => {
      await expect(
        toggleResultFail.current.mutateAsync({ itemId: 't1', completed: true }),
      ).rejects.toBeTruthy();
    });

    const rolled = renderHook(
      () => {
        const qc = useQueryClient();
        return qc.getQueryData(todoKeys.list(listId));
      },
      { wrapper: TestWrapper },
    );
    expect(
      (rolled.result.current as any).todos.find((t: any) => t.id === 't1')
        .completed,
    ).toBe(false);
  }, 10000);
});

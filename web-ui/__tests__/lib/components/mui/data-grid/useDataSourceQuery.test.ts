import { act, renderHook, waitFor } from '@/__tests__/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GridLogicOperator } from '@mui/x-data-grid-pro';
import { useDataSource } from '@/lib/components/mui/data-grid/useDataSource';
import React from 'react';

// Mock fetch globally
global.fetch = jest.fn();

const TEST_URL = 'http://localhost:9999/api/test';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const [url] = queryKey;
          const response = await fetch(`${url}`);
          if (!response.ok) {
            throw new Error(
              `Network response was not ok: ${response.statusText}`,
            );
          }
          return response.json();
        },
      },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  TestWrapper.displayName = 'TestWrapper';

  return TestWrapper;
};

describe('useDataSource', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { result } = renderHook(() => useDataSource({ url: TEST_URL }), {
      wrapper: createWrapper(),
    });
    act(() => {
      waitFor(() => result.current.isLoading);
    });

    expect(result.current.loadError).toBe(null);
    expect(typeof result.current.getRows).toBe('function');
    expect(typeof result.current.updateRow).toBe('function');
  });
  
  it('should update row via PUT request', async () => {
    const mockUpdatedRow = { id: 1, name: 'Updated Test' };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdatedRow,
    });

    const { result } = renderHook(() => useDataSource({ url: TEST_URL }), {
      wrapper: createWrapper(),
    });

    if (result.current.updateRow) {
      const response = await result.current.updateRow({
        rowId: 1,
        updatedRow: mockUpdatedRow,
        previousRow: { id: 1, name: 'Test' },
      });

      expect(response).toEqual(mockUpdatedRow);
      expect(fetch).toHaveBeenCalledWith(TEST_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdatedRow),
      });
    }
  });

  it('should build query parameters correctly', async () => {
    const mockResponse = { rows: [], rowCount: 0 };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useDataSource({ url: TEST_URL }), {
      wrapper: createWrapper(),
    });

    await result.current.getRows({
      paginationModel: { page: 1, pageSize: 25 },
      sortModel: [{ field: 'name', sort: 'asc' }],
      filterModel: {
        items: [{ field: 'status', operator: 'equals', value: 'active' }],
        logicOperator: GridLogicOperator.And,
      },
      start: 25,
      end: 50,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/test\?num=25&page=2&sort=name%3Aasc&filter=/,
      ),
    );
  });
});

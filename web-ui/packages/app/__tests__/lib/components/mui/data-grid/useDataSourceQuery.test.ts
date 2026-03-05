import { act, renderHook, waitFor } from '../../../../shared/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GridLogicOperator } from '@mui/x-data-grid-pro';
import { useDataSource } from '../../../../../lib/components/mui/data-grid/useDataSource';
import React, { useEffect } from 'react';

const fetchMock = jest.fn();

jest.mock('../../../../../lib/fetch-service', () => ({
  resolveFetchService: jest.fn(() => fetchMock),
}));

const TEST_URL = 'http://localhost:9999/api/test';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: async ({ queryKey }) => {
          const [url] = queryKey;
          const response = await fetchMock(`${url}`);
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
    (global as unknown as { fetch?: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ rows: [], rowCount: 0 }),
    });
  });

  it('should initialize with default state', async () => {
    const { result } = renderHook(() => useDataSource({ url: TEST_URL }), {
      wrapper: createWrapper(),
    });
    act(() => {
      waitFor(() => result.current.isLoading);
      waitFor(() => !result.current.isLoading);
    });

    expect(result.current.loadError).toBe(null);
    expect(typeof result.current.getRows).toBe('function');
    expect(typeof result.current.updateRow).toBe('function');
  });

  it('should update row via PUT request', async () => {
    const mockUpdatedRow = { id: 1, name: 'Updated Test' };
    const mockMutationResponse = { status: 'ok' };

    fetchMock.mockImplementation(
      async (_url: string, init?: RequestInit) => {
        if (init?.method === 'PUT') {
          return {
            ok: true,
            json: async () => mockMutationResponse,
          };
        }

        return {
          ok: true,
          json: async () => ({ rows: [], rowCount: 0 }),
        };
      },
    );

    const { result } = renderHook(() => useDataSource({ url: TEST_URL }), {
      wrapper: createWrapper(),
    });

    if (result.current.updateRow) {
      const response = await result.current.updateRow({
        rowId: 1,
        updatedRow: mockUpdatedRow,
        previousRow: { id: 1, name: 'Test' },
      });

      expect(response).toEqual(mockMutationResponse);
      expect(fetchMock).toHaveBeenCalledWith(TEST_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdatedRow),
      });
    }
  });
});

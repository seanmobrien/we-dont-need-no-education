import { act, renderHook, waitFor } from '@/__tests__/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDataSource } from '@/lib/components/mui/data-grid/useDataSource';
import React from 'react';
import { fetch } from '@/lib/nextjs-util/fetch';
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
                        throw new Error(`Network response was not ok: ${response.statusText}`);
                    }
                    return response.json();
                },
            },
        },
    });
    const TestWrapper = ({ children }) => React.createElement(QueryClientProvider, { client: queryClient }, children);
    TestWrapper.displayName = 'TestWrapper';
    return TestWrapper;
};
describe('useDataSource', () => {
    beforeEach(() => {
        fetch.mockResolvedValue({
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
        fetch.mockResolvedValueOnce({
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
});
//# sourceMappingURL=useDataSourceQuery.test.js.map
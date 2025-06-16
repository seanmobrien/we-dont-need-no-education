import { renderHook, act, waitFor } from '@testing-library/react';
import { useDataSource } from '@/lib/components/mui/data-grid/useDataSource';
import { GridRecordCache } from '@/lib/components/mui/data-grid/grid-record-cache';
import type { DataSourceProps } from '@/lib/components/mui/data-grid/types';

// Mock RequestCacheRecord
jest.mock('@/lib/components/mui/data-grid/grid-record-cache');
const mockRequestCacheRecord = GridRecordCache as jest.Mocked<
  typeof GridRecordCache
>;

// Mock dependencies
jest.mock('@/lib/react-util', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn((error) => ({
      message: error instanceof Error ? error.message : 'Unknown error',
    })),
  },
}));

describe('useDataSource', () => {
  let mockSetIsLoading: jest.Mock;
  let mockSetError: jest.Mock;
  let mockGetRecordData: jest.Mock;

  const defaultProps: DataSourceProps = {
    setIsLoading: jest.fn(),
    setError: jest.fn(),
    url: 'https://api.example.com/data',
    getRecordData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetIsLoading = jest.fn();
    mockSetError = jest.fn();
    mockGetRecordData = jest.fn();

    // Mock RequestCacheRecord.get to return a successful response
    mockRequestCacheRecord.getWithFetch.mockResolvedValue({
      rows: [
        { id: 1, name: 'Test Item 1' },
        { id: 2, name: 'Test Item 2' },
      ],
      rowCount: 2,
    });
  });

  it('should fetch initial data on mount', async () => {
    const props = {
      ...defaultProps,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
      getRecordData: mockGetRecordData,
    };

    renderHook(() => useDataSource(props));

    // Wait for the initial data fetch to complete
    await waitFor(() => {
      expect(mockRequestCacheRecord.getWithFetch).toHaveBeenCalledWith({
        url: 'https://api.example.com/data',
        page: 0,
        pageSize: 10,
        sort: [],
        filter: { items: [] },
        setIsLoading: mockSetIsLoading,
        getRecordData: mockGetRecordData,
      });
    });

    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
  });

  it('should return cached data when getRows is called with same parameters', async () => {
    const props = {
      ...defaultProps,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
      getRecordData: mockGetRecordData,
    };

    const { result } = renderHook(() => useDataSource(props));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockRequestCacheRecord.getWithFetch).toHaveBeenCalledTimes(1);
    });

    // Reset mock call count to track subsequent calls
    const initialCallCount =
      mockRequestCacheRecord.getWithFetch.mock.calls.length;

    // Call getRows with the same parameters as initial fetch
    let rowsResult;
    await act(async () => {
      rowsResult = await result.current.getRows({
        paginationModel: { page: 0, pageSize: 10 },
        sortModel: [],
        filterModel: { items: [] },
        start: '',
        end: 0,
      });
    });

    // Should not make another request since parameters are the same
    expect(mockRequestCacheRecord.getWithFetch).toHaveBeenCalledTimes(
      initialCallCount,
    );
    expect(rowsResult).toEqual({
      rows: [
        { id: 1, name: 'Test Item 1' },
        { id: 2, name: 'Test Item 2' },
      ],
      rowCount: 2,
    });
  });

  it('should fetch new data when getRows is called with different parameters', async () => {
    const props = {
      ...defaultProps,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
      getRecordData: mockGetRecordData,
    };

    const { result } = renderHook(() => useDataSource(props));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockRequestCacheRecord.getWithFetch).toHaveBeenCalledTimes(1);
    });

    // Mock a different response for the new parameters
    mockRequestCacheRecord.getWithFetch.mockResolvedValueOnce({
      rows: [
        { id: 3, name: 'Test Item 3' },
        { id: 4, name: 'Test Item 4' },
      ],
      rowCount: 2,
    });

    // Call getRows with different parameters
    let rowsResult;
    await act(async () => {
      rowsResult = await result.current.getRows({
        paginationModel: { page: 1, pageSize: 10 },
        sortModel: [],
        filterModel: { items: [] },
        start: '',
        end: 0,
      });
    });

    // Should make a new request
    expect(mockRequestCacheRecord.getWithFetch).toHaveBeenCalledWith({
      url: 'https://api.example.com/data',
      page: 1,
      pageSize: 10,
      sort: [],
      filter: { items: [] },
      setIsLoading: mockSetIsLoading,
      getRecordData: mockGetRecordData,
    });

    expect(rowsResult).toEqual({
      rows: [
        { id: 3, name: 'Test Item 3' },
        { id: 4, name: 'Test Item 4' },
      ],
      rowCount: 2,
    });
  });

  it('should handle errors during data fetch', async () => {
    const props = {
      ...defaultProps,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
      getRecordData: mockGetRecordData,
    };

    // Mock RequestCacheRecord.get to reject
    const testError = new Error('Network error');
    mockRequestCacheRecord.getWithFetch.mockRejectedValue(testError);

    renderHook(() => useDataSource(props));

    // Wait for the error to be handled
    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Network error');
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should maintain the same interface for updateRow', async () => {
    const props = {
      ...defaultProps,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
      getRecordData: mockGetRecordData,
    };

    // Mock fetch for updateRow
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'Updated Item' }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useDataSource(props));

    await act(async () => {
      const current = result.current;
      expect(current).toBeDefined();
      expect(current.updateRow).toBeDefined();
      if (!current.updateRow) {
        throw new Error('updateRow is not defined');
      }
      const updateResult =
        (await current.updateRow({
          updatedRow: { id: 1, name: 'Updated Item' },
          rowId: '',
          previousRow: {},
        })) ?? Promise.reject('updateRow is not defined');
      expect(updateResult).toEqual({ id: 1, name: 'Updated Item' });
    });

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, name: 'Updated Item' }),
    });
  });
});

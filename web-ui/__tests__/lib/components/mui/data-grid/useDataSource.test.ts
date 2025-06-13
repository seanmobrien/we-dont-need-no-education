import { renderHook, act, waitFor } from '@testing-library/react';
import { useDataSource } from '@/lib/components/mui/data-grid/useDataSource';
import { RequestCacheRecord } from '@/lib/components/mui/data-grid/request-cache-record';
import type { DataSourceProps } from '@/lib/components/mui/data-grid/types';

// Mock RequestCacheRecord
jest.mock('@/lib/components/mui/data-grid/request-cache-record');
const mockRequestCacheRecord = RequestCacheRecord as jest.Mocked<typeof RequestCacheRecord>;

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
    mockRequestCacheRecord.get.mockResolvedValue({
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
      expect(mockRequestCacheRecord.get).toHaveBeenCalledWith({
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
      expect(mockRequestCacheRecord.get).toHaveBeenCalledTimes(1);
    });

    // Reset mock call count to track subsequent calls
    const initialCallCount = mockRequestCacheRecord.get.mock.calls.length;

    // Call getRows with the same parameters as initial fetch
    let rowsResult;
    await act(async () => {
      rowsResult = await result.current.getRows({
        paginationModel: { page: 0, pageSize: 10 },
        sortModel: [],
        filterModel: { items: [] },
      });
    });

    // Should not make another request since parameters are the same
    expect(mockRequestCacheRecord.get).toHaveBeenCalledTimes(initialCallCount);
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
      expect(mockRequestCacheRecord.get).toHaveBeenCalledTimes(1);
    });

    // Mock a different response for the new parameters
    mockRequestCacheRecord.get.mockResolvedValueOnce({
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
      });
    });

    // Should make a new request
    expect(mockRequestCacheRecord.get).toHaveBeenCalledWith({
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
    mockRequestCacheRecord.get.mockRejectedValue(testError);

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
      const updateResult = await result.current.updateRow({
        updatedRow: { id: 1, name: 'Updated Item' },
      });
      expect(updateResult).toEqual({ id: 1, name: 'Updated Item' });
    });

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, name: 'Updated Item' }),
    });
  });
});
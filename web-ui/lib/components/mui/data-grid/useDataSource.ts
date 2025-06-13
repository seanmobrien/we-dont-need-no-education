import type {
  GridFilterModel,
  GridGetRowsParams,
  GridGetRowsResponse,
  GridPaginationModel,
  GridSortModel,
  GridUpdateRowParams,
} from '@mui/x-data-grid-pro';
import type { DataSourceProps, ExtendedGridDataSource } from './types';
import { LoggedError } from '@/lib/react-util';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { RequestCacheRecord } from './request-cache-record';

/**
 * Memoized data source object for a grid component, providing methods to fetch and update rows.
 *
 * @remarks
 * - The `getRows` method retrieves paginated key points for a given email, using a cache to avoid redundant requests.
 *   It manages loading state and error handling internally.
 * - The `updateRow` method updates a specific key point row via a PUT request and handles errors appropriately.
 *
 * @param emailId - The identifier for the email whose key points are being managed.
 * @param isLoading - Boolean indicating if a data fetch is currently in progress.
 * @param setError - Function to set error state in the parent component.
 *
 * @returns {ExtendedGridDataSource} An object implementing the grid data source interface with `getRows` and `updateRow` methods.
 *
 * @dependency
 * - Depends on `RequestCacheRecord` for caching fetch requests.
 * - Uses `siteBuilder.api.email.properties(emailId).keyPoints` for API endpoints.
 *
 * @see GridDataSource
 * @see GridGetRowsParams
 * @see GridUpdateRowParams
 */
export const useDataSource = ({
  setIsLoading,
  setError,
  url,
  getRecordData,
}: DataSourceProps): ExtendedGridDataSource => {
  // State to track the last request and its result
  const [lastRequest, setLastRequest] = useState<{
    key: string;
    promise: Promise<GridGetRowsResponse>;
    result?: GridGetRowsResponse;
  } | null>(null);

  // Helper function to create a cache key from parameters
  const createCacheKey = useCallback((
    page: number,
    pageSize: number,
    sortModel: GridSortModel,
    filterModel: GridFilterModel
  ): string => {
    return JSON.stringify({ page, pageSize, sortModel, filterModel });
  }, []);

  // Memoized fetch function
  const fetchData = useCallback(async (
    page: number,
    pageSize: number, 
    sortModel: GridSortModel,
    filterModel: GridFilterModel
  ): Promise<GridGetRowsResponse> => {
    const cacheKey = createCacheKey(page, pageSize, sortModel, filterModel);
    
    // If we already have a request for these exact parameters, return it
    if (lastRequest && lastRequest.key === cacheKey) {
      if (lastRequest.result) {
        return lastRequest.result;
      }
      return lastRequest.promise;
    }

    // Create new request
    const promise = (async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await RequestCacheRecord.get({
          url: String(url),
          page,
          pageSize,
          sort: sortModel,
          filter: filterModel,
          setIsLoading,
          getRecordData,
        });
        
        // Update the cache with the result
        setLastRequest(prev => prev?.key === cacheKey ? { ...prev, result } : prev);
        return result;
      } catch (err: unknown) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
          log: true,
          source: 'grid::dataSource',
        });
        setError(le.message);
        const emptyResult = { rows: [], rowCount: 0 };
        // Update the cache with the error result
        setLastRequest(prev => prev?.key === cacheKey ? { ...prev, result: emptyResult } : prev);
        return emptyResult;
      } finally {
        setIsLoading(false);
      }
    })();

    // Store the promise immediately
    setLastRequest({ key: cacheKey, promise });
    return promise;
  }, [url, getRecordData, setIsLoading, setError, createCacheKey, lastRequest]);

  // Effect to fetch initial data
  useEffect(() => {
    // Fetch initial data with default parameters
    fetchData(0, 10, [], { items: [] });
  }, [fetchData]);

  return useMemo<ExtendedGridDataSource>(
    () => ({
      getRows: async (
        {
          paginationModel: {
            pageSize = 10,
            page = 0,
          } = {} as GridPaginationModel,
          sortModel = [] as GridSortModel,
          filterModel = { items: [] } as GridFilterModel,
        }: GridGetRowsParams = {} as GridGetRowsParams,
      ) => {
        return await fetchData(page, pageSize, sortModel, filterModel);
      },
      updateRow: async ({ updatedRow }: GridUpdateRowParams) => {
        try {
          const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRow),
          });
          if (!response.ok) {
            throw new Error(`Failed to update row: ${response.statusText}`);
          }
          return await response.json();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          throw err;
        }
      },
      onDataSourceError: (error: unknown) => {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'grid::dataSource',
        });
        setError(le.message);
      },
    }),
    [fetchData, url, setError],
  );
};

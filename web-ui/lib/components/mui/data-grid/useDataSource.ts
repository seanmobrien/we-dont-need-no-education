import type {
  GridFilterModel,
  GridGetRowsParams,
  GridPaginationModel,
  GridSortModel,
  GridUpdateRowParams,
  GridGetRowsResponse,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';
import type { DataSourceProps, ExtendedGridDataSource } from './types';
import { LoggedError } from '@/lib/react-util';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  // QueryClient,
} from '@tanstack/react-query';
import { dataGridQueryClient } from './query-client';
// import { has } from 'lodash';

/**
 * Generates a unique query key for React Query based on the data source parameters.
 */
const createQueryKey = (
  url: string,
  page?: number,
  pageSize?: number,
  sortModel?: GridSortModel,
  filterModel?: GridFilterModel,
) => {
  return ['dataGrid', url, page, pageSize, sortModel, filterModel] as const;
};

/**
 * Fetches data from the API endpoint with the given parameters.
 */
const fetchGridData = async (
  url: string,
  page?: number,
  pageSize?: number,
  sortModel?: GridSortModel,
  filterModel?: GridFilterModel,
): Promise<GridGetRowsResponse> => {
  const urlWithParams = new URL(url);
  if (pageSize) {
    urlWithParams.searchParams.set('num', pageSize.toString());
  }
  if (page) {
    urlWithParams.searchParams.set('page', (page + 1).toString()); // API is 1-based, DataGrid is 0-based
  }
  console.log('in fetchGridData');

  // Add sort parameters
  if (sortModel?.length) {
    const sortParams = sortModel
      .map(({ field, sort }) => `${field}:${sort}`)
      .join(',');
    urlWithParams.searchParams.set('sort', sortParams);
  }

  // Add filter parameters
  if (filterModel?.items?.length ?? filterModel?.quickFilterValues?.length) {
    urlWithParams.searchParams.set('filter', JSON.stringify(filterModel));
  }

  const response = await fetch(urlWithParams.toString());

  console.log('fetchGridData::response');

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const parsed = await response.json();
  if (!parsed) {
    throw new Error('No data returned from API');
  }
  if (typeof parsed === 'object') {
    if ('rows' in parsed) {
      return parsed;
    }
    if ('results' in parsed) {
      const result: GridGetRowsResponse = {
        rows: parsed.results as Array<GridValidRowModel>,
      };
      if (
        'pageStats' in parsed &&
        typeof parsed.pageStats === 'object' &&
        !!parsed.pageStats &&
        'total' in parsed.pageStats
      ) {
        result.rowCount = Number(parsed.pageStats.total);
      }
      return result;
    }
  }
  throw new Error('Unexpected data format received from API', {
    cause: parsed,
  });
};

/**
 * Custom React hook for managing a data source for a MUI Data Grid component with React Query.
 *
 * This hook provides functionality for loading, updating, and handling errors for grid data,
 * including pagination, sorting, and filtering. It uses React Query for efficient data fetching,
 * caching, and state management.
 *
 * @param {DataSourceProps} params - The configuration object for the data source.
 * @param {string} params.url - The endpoint URL for fetching and updating data.
 * @param {Function} params.getRecordData - A function to extract record data from the response.
 * @returns {ExtendedGridDataSource} An object containing data source methods and state:
 * - `getRows`: Fetches rows with pagination, sorting, and filtering using React Query.
 * - `updateRow`: Updates a row in the data source.
 * - `onDataSourceError`: Handles and logs data source errors.
 * - `isLoading`: Indicates if a data operation is in progress.
 * - `clearLoadError`: Clears the current load error.
 * - `lastDataSourceError`: The current load error message, if any.
 *
 * @example
 * const dataSource = useDataSourceWithQuery({ url: '/api/data', getRecordData });
 * // Use dataSource.getRows, dataSource.updateRow, etc. in your grid component.
 */
export const useDataSource = ({
  url,
  // getRecordData,
}: DataSourceProps): ExtendedGridDataSource => {
  const [lastDataSourceError, setLastDataSourceError] = useState<string | null>(
    null,
  );
  const [currentQueryParams, setCurrentQueryParams] = useState<{
    page?: number;
    pageSize?: number;
    sortModel?: GridSortModel;
    filterModel?: GridFilterModel;
  } | null>(null);
  const hasMounted = useRef(false);

  const queryClient = useQueryClient();

  // Use React Query for data fetching
  const { isLoading, error: queryError } = useQuery(
    {
      queryKey: currentQueryParams
        ? createQueryKey(
            String(url),
            currentQueryParams?.page,
            currentQueryParams?.pageSize,
            currentQueryParams?.sortModel,
            currentQueryParams?.filterModel,
          )
        : ['dataGrid', String(url)],

      queryFn: async () => {
        return await fetchGridData(
          String(url),
          currentQueryParams?.page,
          currentQueryParams?.pageSize,
          currentQueryParams?.sortModel,
          currentQueryParams?.filterModel,
        );
      },
      enabled: !!currentQueryParams && !!url,
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error) {
          const status = (error as Error & { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
    },
    dataGridQueryClient,
  );

  /*

  if (queryError) {
    const actualLastError = lastDataSourceError;
    if (actualLastError) {
      if (actualLastError !== queryError.message) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(queryError, {
          log: true,
          source: 'grid::dataSource::query',
        });
        setLastDataSourceError(le.message);
      }
    } else {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(queryError, {
        log: true,
        source: 'grid::dataSource::query',
      });
      setLastDataSourceError(le.message);
    }
  }

  */

  // Mutation for updating rows
  const updateRowMutation = useMutation(
    {
      mutationFn: async (params: GridUpdateRowParams) => {
        const response = await fetch(String(url), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params.updatedRow),
        });
        if (!response.ok) {
          throw new Error(`Failed to update row: ${response.statusText}`);
        }
        return response.json();
      },
      onSuccess: () => {
        // Invalidate and refetch relevant queries
        queryClient.invalidateQueries({
          queryKey: ['dataGrid', String(url)],
        });
      },
      onError: (error) => {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'grid::dataSource::update',
        });
        setLastDataSourceError(le.message);
      },
    },
    dataGridQueryClient,
  );

  /**
   * Clears the current load error state if one exists.
   */
  const clearLoadError = useCallback(() => {
    if (lastDataSourceError) {
      setLastDataSourceError(null);
    }
  }, [lastDataSourceError]);

  /**
   * Updates a row in the data source using React Query mutation.
   */
  const updateRow = useCallback(
    async (params: GridUpdateRowParams) => {
      return Promise.resolve(params);

      try {
        return await updateRowMutation.mutateAsync(params);
      } catch (err) {
        throw err;
      }
    },
    [updateRowMutation],
  );

  /**
   * Handles errors encountered during data source operations.
   */
  const onDataSourceError = useCallback(
    (error: unknown) => {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'grid::dataSource',
      });
      if (!lastDataSourceError) {
        setLastDataSourceError(le.message);
      }
    },
    [lastDataSourceError],
  );

  /**
   * Fetches rows using React Query with pagination, sorting, and filtering.
   */
  const getRows = useCallback(
    async (props: GridGetRowsParams) => {
      try {
        /*
        if (lastDataSourceError) {
          setLastDataSourceError(null);
        }
        */
        if (!url || !props) {
          return { rows: [], hasNextPage: true };
        }

        const {
          paginationModel: {
            pageSize = 10,
            page = 0,
          } = {} as GridPaginationModel,
          sortModel = [] as GridSortModel,
          filterModel = { items: [] } as GridFilterModel,
        } = props;

        // Update query parameters to trigger React Query
        setCurrentQueryParams((current) => {
          if (
            !current ||
            current.page !== page ||
            current.pageSize !== pageSize ||
            JSON.stringify(current.sortModel) !== JSON.stringify(sortModel) ||
            JSON.stringify(current.filterModel) !== JSON.stringify(filterModel)
          ) {
            return {
              page,
              pageSize,
              sortModel,
              filterModel,
            };
          }
          return current;
        });

        // If we have cached data for these parameters, return it immediately
        const queryKey = createQueryKey(
          String(url),
          page,
          pageSize,
          sortModel,
          filterModel,
        );

        const cachedData = queryClient.getQueryData(queryKey);

        if (cachedData) {
          return cachedData as GridGetRowsResponse;
        }

        // Otherwise, trigger a fetch and wait for the result
        const result = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => {
            console.log('in queryClient queryFn');
            return fetchGridData(
              String(url),
              page,
              pageSize,
              sortModel,
              filterModel,
            );
          },
          staleTime: 30 * 1000,
          gcTime: 5 * 60 * 1000,
        });

        return result;
      } catch (err: unknown) {
        console.log('getRows::error', err);
        throw err;
        /*
        const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
          log: true,
          source: 'grid::dataSource',
        });
        if (!lastDataSourceError) {
          setLastDataSourceError(le.message);
        }
        return { rows: [], rowCount: 0 };
        */
      }
    },
    [url, queryClient],
  );

  // Combine query error with local error state
  const combinedLoadError = useMemo(() => {
    if (lastDataSourceError) return lastDataSourceError;
    if (queryError) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(queryError, {
        log: true,
        source: 'grid::dataSource::query',
      });
      return le.message;
    }
    return null;
  }, [lastDataSourceError, queryError]);

  useEffect(() => {
    hasMounted.current = true;
    return () => {
      // hasMounted.current = false;
    };
  }, []);

  // Memoize the data source object to prevent unnecessary re-renders
  return useMemo<ExtendedGridDataSource>(() => {
    return {
      getRows,
      updateRow,
      onDataSourceError,
      isLoading:
        !hasMounted.current || isLoading || updateRowMutation.isPending,
      clearLoadError,
      loadError: combinedLoadError,
    };
  }, [
    clearLoadError,
    getRows,
    isLoading,
    updateRowMutation.isPending,
    combinedLoadError,
    onDataSourceError,
    updateRow,
  ]);
};

/*
 * Custom React hook for managing a data source for a MUI Data Grid component (original implementation).
 *
 * This hook provides functionality for loading, updating, and handling errors for grid data,
 * including pagination, sorting, and filtering. It manages loading and error states internally,
 * and exposes utility functions for interacting with the data source.
 *
 * @param {DataSourceProps} params - The configuration object for the data source.
 * @param {string} params.url - The endpoint URL for fetching and updating data.
 * @param {Function} params.getRecordData - A function to extract record data from the response.
 * @returns {ExtendedGridDataSource} An object containing data source methods and state:
 * - `getRows`: Fetches rows with pagination, sorting, and filtering.
 * - `updateRow`: Updates a row in the data source.
 * - `onDataSourceError`: Handles and logs data source errors.
 * - `isLoading`: Indicates if a data operation is in progress.
 * - `clearLoadError`: Clears the current load error.
 * - `lastDataSourceError`: The current load error message, if any.
 *
 * @example
 * const dataSource = useDataSource({ url: '/api/data', getRecordData });
 * // Use dataSource.getRows, dataSource.updateRow, etc. in your grid component.
 * /
export const useDataSource = ({
  url,
  // getRecordData,
}: DataSourceProps): ExtendedGridDataSource => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastDataSourceError, setLastDataSourceError] = useState<string | null>(null);

  /**
   * Clears the current load error state if one exists.
   *
   * This function checks if there is a load error present and, if so,
   * resets it to `null`. Intended to be used as a callback to reset
   * error state in the data loading process.
   *
   * @returns {void}
   * /
  const clearLoadError = useCallback(() => {
    if (lastDataSourceError) {
      setLastDataSourceError(null);
    }
  }, [lastDataSourceError]);

  /**
   * Updates a row in the data source by sending a PUT request to the specified URL.
   *
   * @param params - An object containing the updated row data.
   * @param params.updatedRow - The row data to be updated.
   * @returns A promise that resolves with the updated row data from the server.
   * @throws Will throw an error if the network request fails or the response is not OK.
   * /
  const updateRow = useCallback(
    async ({ updatedRow }: GridUpdateRowParams) => {
      try {
        const response = await fetch(String(url), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRow),
        });
        if (!response.ok) {
          throw new Error(`Failed to update row: ${response.statusText}`);
        }
        return await response.json();
      } catch (err) {
        setLastDataSourceError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      }
    },
    [url],
  );

  /**
   * Handles errors encountered during data source operations in the data grid.
   *
   * This callback logs the error using the `LoggedError.isTurtlesAllTheWayDownBaby` utility,
   * tagging it with the source 'grid::dataSource'. If a load error has not already been set,
   * it updates the local error state with the error message. This prevents redundant error
   * state updates, as detailed error information can be found in the logs.
   *
   * @param error - The error object encountered during data source operations.
   * /
  const onDataSourceError = useCallback(
    (error: unknown) => {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'grid::dataSource',
      });
      if (!lastDataSourceError) {
        // Not a ton of value in setting this multiple times - the people who care will know to look at the logs.
        setLastDataSourceError(le.message);
      }
    },
    [lastDataSourceError],
  );

  /**
   * Fetches rows for a data grid based on pagination, sorting, and filtering parameters.
   *
   * This function manages loading and error states, and retrieves data from a cache or remote source.
   * It returns the result containing the rows and pagination information.
   *
   * @param params - Parameters for fetching rows, including pagination, sorting, and filtering models.
   * @param params.paginationModel - Pagination settings including `pageSize` and `page`.
   * @param params.sortModel - Sorting model for the grid.
   * @param params.filterModel - Filtering model for the grid.
   * @returns A promise resolving to an object containing the fetched rows and pagination info.
   *
   * @remarks
   * - If the `url` is not provided, returns an empty rows array and indicates there is a next page.
   * - Handles loading and error state updates.
   * - Catches and logs errors, returning an empty result on failure.
   * /
  const getRows = useCallback(
    async (
      {
        paginationModel: {
          pageSize = 10,
          page = 0,
        } = {} as GridPaginationModel,
        sortModel = [] as GridSortModel,
        filterModel = { items: [] } as GridFilterModel,
      }: GridGetRowsParams = {} as GridGetRowsParams,
    ) => {
      // Import GridRecordCache here to avoid circular dependency issues
      const { GridRecordCache } = await import('./grid-record-cache');

      // Create new request
      try {
        if (!isLoading) {
          setIsLoading(true);
        }
        if (lastDataSourceError) {
          setLastDataSourceError(null);
        }
        if (!url) {
          return { rows: [], hasNextPage: true };
        }

        const result = await GridRecordCache.getWithFetch({
          url: String(url),
          page,
          pageSize,
          sort: sortModel,
          filter: filterModel,
          setIsLoading,
        });

        return result;
      } catch (err: unknown) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
          log: true,
          source: 'grid::dataSource',
        });
        if (!lastDataSourceError) {
          setLastDataSourceError(le.message);
        }
        return { rows: [], rowCount: 0 };
      } finally {
        if (isLoading) {
          // If we were loading, we are no longer loading.
          setIsLoading(false);
        }
      }
    },
    [lastDataSourceError, isLoading, url],
  );

  // Memoize the data source object to prevent unnecessary re-renders
  // and to ensure that the same instance is used across renders.  Note while individual
  // properties are individually memoized, this final useMemo ensures that the entire
  // object reference remains stable, which is important if the result is passed to a child
  // component that relies on reference equality for performance optimizations.
  return useMemo<ExtendedGridDataSource>(() => {
    return {
      getRows,
      updateRow,
      onDataSourceError,
      isLoading,
      clearLoadError,
      loadError,
    };
  }, [
    clearLoadError,
    getRows,
    isLoading,
    lastDataSourceError,
    onDataSourceError,
    updateRow,
  ]);
};
*/

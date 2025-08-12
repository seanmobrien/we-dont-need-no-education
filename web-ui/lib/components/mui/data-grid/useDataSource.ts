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
import { isError, isTruthy } from '@/lib/react-util/_utility-methods';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetch } from '@/lib/nextjs-util/fetch';
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  // QueryClient,
} from '@tanstack/react-query';
import { log } from '@/lib/logger';
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
  url: urlFromProps,
}: DataSourceProps): ExtendedGridDataSource => {
  const [currentQueryParams, setCurrentQueryParams] = useState<{
    page?: number;
    pageSize?: number;
    sortModel?: GridSortModel;
    filterModel?: GridFilterModel;
  } | null>(null);

  let url: string | URL = urlFromProps; // Initialize with default value
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const isDrizzle = isTruthy(searchParams.get('drizzle'));
    if (isDrizzle) {
      const baseUrl = new URL(urlFromProps, window.location.origin);
      url = new URL(new URL(baseUrl.pathname + '/drizzle', window.location.origin));
    } else {
      url = urlFromProps;
    }
  }

  const [hasMounted, setHasMounted] = useState(false);
  const pendingQueries = useRef<
    Array<[(x: GridGetRowsResponse) => void, (Error: unknown) => void]>
  >([]);
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
    }
  }, [hasMounted]);
  const queryClient: QueryClient = useQueryClient();
  // Use React Query for data fetching
  const {
    isLoading,
    isSuccess,
    isPending,
    error: queryError,
    data,
  } = useQuery({
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
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: true, // Refetch when connection is restored
    enabled: hasMounted && !!currentQueryParams && !!url,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      let willRetry = failureCount < 3;
      if (error instanceof Error && 'status' in error) {
        const status = (error as Error & { status: number }).status;
        if (status >= 400 && status < 500) {
          // Don't retry on a client error (bad request, url not found, unauthorized, etc.)
          willRetry = false;
        }
      }
      if (willRetry) {
        log((l) =>
          l.warn({
            message: `An unexpected error occurred while loading data; there are ${3 - failureCount} retries remaining.  Details: ${isError(error) ? error.message : String(error)}`,
            source: 'grid::dataSource',
            data: error,
          }),
        );
      } else {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'grid::dataSource',
          data: error,
        });
      }
      return willRetry;
    },
  });

  useEffect(() => {
    if (isPending) {
      return;
    }
    const cancelQueries = (error: unknown) => {
      log((l) =>
        l.verbose(
          'Cleaning up pending queries',
          'error',
          error,
          'url',
          url,
          'currentQueryParams',
          currentQueryParams,
        ),
      );
      pendingQueries.current.forEach(([, reject]) => {
        try {
          reject(error);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (noOp) {
          // Already logged failure
        }
      });
      pendingQueries.current = [];
    };
    if (isSuccess && data) {
      // If we have data, resolve any pending queries
      log((l) =>
        l.verbose(
          'useDataSource::query resolved with data',
          data,
          'url',
          url,
          'currentQueryParams',
          currentQueryParams,
        ),
      );
      pendingQueries.current.forEach(([resolve]) => resolve(data));
      pendingQueries.current = [];
      return;
    }
    if (queryError && pendingQueries.current.length > 0) {
      cancelQueries(queryError);
      return;
    }
    return () => {
      // Cleanup function to clear pending queries on unmount or when query state changes
      if (!pendingQueries.current?.length) {
        return;
      }
      cancelQueries(new Error('Component unmounted or query state changed'));
    };
  }, [isSuccess, queryError, data, url, currentQueryParams, isPending]);

  // Mutation for updating rows
  const updateRowMutation = useMutation({
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
        log: false,
        source: 'grid::dataSource::update',
      });
      log((l) =>
        l.error(
          'useDataSource::updateRowMutation::error',
          le.message,
          'url',
          url,
        ),
      );
    },
    retry: (failureCount, error) => {
      // Don't retry mutations on 4xx errors
      if (error instanceof Error && 'status' in error) {
        const status = (error as Error & { status: number }).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });

  /**
   * Updates a row in the data source using React Query mutation.
   */
  const updateRow = useCallback(
    async (params: GridUpdateRowParams) => {
      // return Promise.resolve(params);

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
      if (!Object.is(error, queryError)) {
        log((l) =>
          l.warn('onDataSourceError::error is not query error...', { error }),
        );
      }
    },
    [queryError],
  );

  /**
   * Fetches rows using React Query with pagination, sorting, and filtering.
   */
  const getRows = useCallback(
    (props: GridGetRowsParams) => {
      try {
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

        const queryKey = createQueryKey(
          String(url),
          page,
          pageSize,
          sortModel,
          filterModel,
        );

        return new Promise<GridGetRowsResponse>((resolve, reject) => {
          const timeout = setTimeout(() => {
            try {
              if (isSuccess) {
                log((l) =>
                  l.warn(
                    'getRows::query timed out - resolving with last known good data to prevent promise memory leak',
                    'queryKey',
                    queryKey,
                    'url',
                    url,
                  ),
                );
                resolve(data);
              }

              log((l) =>
                l.warn(
                  'getRows::query timed out - rejecting promise',
                  'queryKey',
                  queryKey,
                  'url',
                  url,
                ),
              );
              // Reject the promise if it takes too long
              reject(
                new Error(
                  `Query for ${queryKey.join(', ')} timed out after 30 seconds`,
                ),
              );
            } catch (err) {
              log((l) =>
                l.warn(
                  'Unexpected error caught in getRows proxy resolution.',
                  err,
                ),
              );
            }
          }, 60 * 1000); // 60 seconds timeout
          const wrapCleanup = <X, Y>(cb: (y: X) => Y): ((y: X) => Y) => {
            return (arg: X) => {
              clearTimeout(timeout);
              return cb(arg);
            };
          };
          pendingQueries.current.push([
            wrapCleanup(resolve),
            wrapCleanup(reject),
          ]);
        });
      } catch (err: unknown) {
        log((l) =>
          l.verbose(
            'getRows::error occurred - rethrowing to react query for disposition',
            err,
          ),
        );
        throw err;
      }
    },
    [url, isSuccess, data, setCurrentQueryParams],
  );

  // Memoize the data source object to prevent unnecessary re-renders
  return useMemo<ExtendedGridDataSource>(() => {
    return {
      getRows,
      updateRow,
      onDataSourceError,
      isLoading: /*!hasMounted || */ isLoading || updateRowMutation.isPending,
      loadError: queryError ? queryError.message : null,
    };
  }, [
    getRows,
    updateRow,
    onDataSourceError,
    // hasMounted,
    isLoading,
    updateRowMutation.isPending,
    queryError,
  ]);
};

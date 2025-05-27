import type {
  GridFilterModel,
  GridGetRowsParams,
  GridPaginationModel,
  GridSortModel,
  GridUpdateRowParams,
} from '@mui/x-data-grid-pro';
import type { DataSourceProps, ExtendedGridDataSource } from './types';
import { LoggedError } from '@/lib/react-util';
import { useMemo } from 'react';
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
}: DataSourceProps): ExtendedGridDataSource =>
  useMemo<ExtendedGridDataSource>(
    () => ({
      getRows: (
        {
          paginationModel: {
            pageSize = 10,
            page = 0,
          } = {} as GridPaginationModel,
          sortModel = [] as GridSortModel,
          filterModel = { items: [] } as GridFilterModel,
        }: GridGetRowsParams = {} as GridGetRowsParams,
      ) =>
        RequestCacheRecord.get({
          url: String(url),
          page,
          pageSize,
          sort: sortModel,
          filter: filterModel,
          setIsLoading,
          getRecordData,
        })
          .catch((err: unknown) => {
            const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
              log: true,
              source: 'grid::dataSource',
            });
            setError(le.message);
            return { rows: [], rowCount: 0 };
          })
          .finally(() => {
            setIsLoading((v) => (v ? false : v));
          }),
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
    [url, setIsLoading, getRecordData, setError],
  );

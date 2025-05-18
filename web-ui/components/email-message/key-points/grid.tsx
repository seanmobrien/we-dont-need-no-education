'use client';

import {
  Grid as Grid,
  Box,
  Paper,
  Typography,
  TableContainer,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridGetRowsParams,
  GridPaginationModel,
  GridRowModel,
  GridUpdateRowParams,
} from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import siteBuilder from '@/lib/site-util/url-builder';
import { simpleScopedLogger } from '@/lib/logger';
import { RequestCacheRecord } from './request-cache-record';
import { ExtendedGridDataSource } from '@/lib/components/mui/types';
import { LoggedError } from '@/lib/react-util';
import {
  StableDefaultInitialState,
  StableDefaultPageSizeOptions,
} from '@/lib/components/mui/data-grid';

const stableColumns: GridColDef[] = [
  { field: 'property_value', headerName: 'Value', width: 300, editable: false },
  {
    field: 'policy_basis',
    headerName: 'Policy Basis',
    editable: false,
  },
  {
    field: 'tags',
    headerName: 'Tags',
    editable: false,
  },
  {
    field: 'relevance',
    headerName: 'Relevance',
    editable: false,
  },
  {
    field: 'compliance',
    headerName: 'Compliance',
    editable: false,
  },
  {
    field: 'severity_ranking',
    headerName: 'Severity Ranking',
    editable: false,
  },
  {
    field: 'inferred',
    headerName: 'Inferred',
    type: 'boolean',
    editable: false,
  },
] as const;

const stableGetRowId = (row: GridRowModel) => {
  const rowId = row?.property_id as string;
  return rowId;
};

const stableGridLogger = simpleScopedLogger('KeyPointsGrid');

export const KeyPointsGrid = ({ emailId }: { emailId: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
   * @returns {GridDataSource} An object implementing the grid data source interface with `getRows` and `updateRow` methods.
   *
   * @dependency
   * - Depends on `RequestCacheRecord` for caching fetch requests.
   * - Uses `siteBuilder.api.email.properties(emailId).keyPoints` for API endpoints.
   *
   * @see GridDataSource
   * @see GridGetRowsParams
   * @see GridUpdateRowParams
   */
  const memoizedDataSource = useMemo(() => {
    let thisIsLoading = isLoading;
    const dataSource: ExtendedGridDataSource = {
      getRows: (
        {
          paginationModel: {
            pageSize = 10,
            page = 0,
          } = {} as GridPaginationModel,
        }: GridGetRowsParams = {} as GridGetRowsParams,
      ) =>
        RequestCacheRecord.get(emailId, page, pageSize, () => {
          setIsLoading((v) => (v ? v : true));
          if (thisIsLoading !== true) {
            setIsLoading(true);
            thisIsLoading = true;
          }
          const url = siteBuilder.api.email.properties(emailId).keyPoints({
            num: pageSize,
            page: page + 1, // API is 1-based, DataGrid is 0-based
          });
          return fetch(url);
        })
          .catch((err) => {
            setError(err);
            return { rows: [] };
          })
          .finally(() => {
            setIsLoading((v) => (v ? false : v));
          }),
      updateRow: async ({ rowId, updatedRow }: GridUpdateRowParams) => {
        try {
          const response = await fetch(
            siteBuilder.api.email.properties(emailId).keyPoints(rowId),
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedRow),
            },
          );
          if (!response.ok) {
            throw new Error(`Failed to update row: ${response.statusText}`);
          }
          return await response.json();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          throw err;
        }
      },
      onDataSourceError: (error) => {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          source: 'grid::dataSource',
        });
        setError(le.message);
      },
    };
    return dataSource;
  }, [emailId, isLoading, setError]);

  return (
    <Grid container spacing={2}>
      {error ? (
        <Box sx={{ color: 'error.main', textAlign: 'center', width: '100%' }}>
          <Typography>Error: {error}</Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
            <TableContainer>
              <DataGrid
                logger={stableGridLogger}
                logLevel="debug"
                columns={stableColumns}
                getRowId={stableGetRowId}
                dataSource={memoizedDataSource}
                initialState={StableDefaultInitialState}
                pageSizeOptions={StableDefaultPageSizeOptions}
                onDataSourceError={memoizedDataSource.onDataSourceError}
              />
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Grid>
  );
};

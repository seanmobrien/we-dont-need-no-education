'use client';
import {
  StableDefaultInitialState,
  StableDefaultPageSizeOptions,
  useGetRowId,
  useDataSource,
} from '@/lib/components/mui/data-grid';
import { simpleScopedLogger } from '@/lib/logger';
import Loading from '@/components/general/loading';
import { Box, Paper, TableContainer } from '@mui/material';
import { DataGridPro, GridValidRowModel } from '@mui/x-data-grid-pro';

import { useEffect, useMemo, useState } from 'react';
import { ServerBoundDataGridProps } from './types';

const stableGridLogger = simpleScopedLogger('KeyPointsGrid');

export const ServerBoundDataGrid = <TRowModel extends GridValidRowModel>({
  columns,
  url,
  getRecordData,
  idColumn,
  initialState: initialStateProp,
  ...props
}: ServerBoundDataGridProps<TRowModel>) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const memoizedDataSource = useDataSource({
    setIsLoading,
    setError,
    url,
    getRecordData,
  });
  const stableGetRowId = useGetRowId(idColumn);

  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
    }
  }, [hasMounted]);

  const initialState = useMemo(
    () => ({
      ...StableDefaultInitialState,
      ...{
        ...initialStateProp,
        pagination: {
          ...StableDefaultInitialState.pagination,
          ...(initialStateProp?.pagination ?? {}),
          paginationModel: {
            ...StableDefaultInitialState.pagination.paginationModel,
            ...(initialStateProp?.pagination?.paginationModel ?? {}),
          },
        },
      },
    }),
    [initialStateProp],
  );
  if (process.env.IS_BUILDING == '1') {
    console.warn('is building, skipping chat panel rendering');
    return <></>;
  }
  return (
    <Box sx={{ width: 'auto', maxWidth: 1 }}>
      <Loading
        loading={!hasMounted || isLoading}
        errorMessage={error ?? null}
        loadingMessage="Loading data grid..."
      />
      {hasMounted && (
        <Paper sx={{ width: 'auto', mb: 2, overflow: 'hidden' }}>
          <TableContainer>
            <DataGridPro<TRowModel>
              filterDebounceMs={500}
              pagination
              logger={stableGridLogger}
              loading={isLoading}
              logLevel={process.env.NODE_ENV === 'development' ? 'warn' : 'error'}
              columns={columns}
              getRowId={stableGetRowId}
              dataSource={memoizedDataSource}
              initialState={initialState}
              pageSizeOptions={StableDefaultPageSizeOptions}
              onDataSourceError={memoizedDataSource.onDataSourceError}
              {...props}
            />
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

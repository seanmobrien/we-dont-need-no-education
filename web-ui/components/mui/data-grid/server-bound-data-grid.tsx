'use client';
import {
  StableDefaultInitialState,
  StableDefaultPageSizeOptions,
  useGetRowId,
  useDataSource,
} from '@/lib/components/mui/data-grid';
import { simpleScopedLogger } from '@/lib/logger';
import {
  Box,
  Paper,
  Typography,
  TableContainer,
  CircularProgress,
  SxProps,
  Theme,
} from '@mui/material';
import { DataGridPro, GridValidRowModel } from '@mui/x-data-grid-pro';

import { useMemo, useState } from 'react';
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

  const memoizedDataSource = useDataSource({
    setIsLoading,
    setError,
    url,
    getRecordData,
  });
  const stableGetRowId = useGetRowId(idColumn);

  const sxWrapper = useMemo<SxProps<Theme>>(() => {
    const sxRet: SxProps<Theme> = {
      width: '100%',
    };
    if (error) {
      sxRet.textAlign = 'center';
      sxRet.color = 'error.main';
    } else if (isLoading) {
      sxRet.textAlign = 'center';
      sxRet.color = 'info';
    }
    return sxRet;
  }, [error, isLoading]);

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
    <Box sx={sxWrapper}>
      {isLoading && (
        <>
          <CircularProgress />
          <Typography>Loading...</Typography>
        </>
      )}
      {error ? (
        <Typography>Error: {error}</Typography>
      ) : (
        <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
          <TableContainer>
            <DataGridPro<TRowModel>
              filterDebounceMs={2000}
              pagination
              logger={stableGridLogger}
              loading={isLoading}
              logLevel="debug"
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

'use client';
import {
  StableDefaultInitialState,
  StableDefaultPageSizeOptions,
  useGetRowId,
  useDataSource,
} from '@/lib/components/mui/data-grid';

import { Box, Paper, TableContainer } from '@mui/material';
import {
  DataGridPro,
  DataGridProProps,
  GridGetRowsError,
  GridGetRowsParams,
  GridLoadingOverlayVariant,
  GridUpdateRowError,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';
import { useCallback, useMemo } from 'react';
import { ServerBoundDataGridProps } from './types';
import { useNotifications } from '@toolpad/core';

import ServerBoundDataGridPropsSchema from './server-bound-data-grid-props-schema';

const stableWrapperStyles = {
  box: { width: 'auto', maxWidth: 1 },
  paper: { width: 'auto', mb: 2, overflow: 'hidden' },
  table: {
    display: 'flex',
    flexBasis: 'column',
    minHeight: '400px',
    maxHeight: '75%',
  },
};

export const ServerBoundDataGrid = <TRowModel extends GridValidRowModel>({
  columns,
  url,
  idColumn,
  initialState: initialStateProp,
  slotProps,
  ...props
}: ServerBoundDataGridProps<TRowModel>) => {
  // Validate props
  ServerBoundDataGridPropsSchema.parse({
    columns,
    url,
    idColumn,
    slotProps,
    initialState: initialStateProp,
  });
  const notifications = useNotifications();
  const { isLoading, ...memoizedDataSource } = useDataSource({
    url,
  });
  const stableGetRowId = useGetRowId(idColumn);
  const stableSlotProps = useMemo(() => {
    return {
      loadingOverlay: {
        variant: 'circular-progress' as GridLoadingOverlayVariant,
        noRowsVariant: 'skeleton' as GridLoadingOverlayVariant,
      },
      row: {
        'data-parentid': `bound-grid-row-${encodeURI(String(url))}-${stableGetRowId}`,
      },
      ...slotProps,
    };
  }, [slotProps, url, stableGetRowId]);
  const onDataSourceErrorOccurred: DataGridProProps['onDataSourceError'] =
    useCallback(
      (error: GridGetRowsError<GridGetRowsParams> | GridUpdateRowError) => {
        // Note the useDataSource hook already handles logging the error and returning it's value,
        // All we need to do is decide whether to show it.
        notifications.show(error.message, {
          severity: 'error',
          autoHideDuration: 60000,
        });
      },
      [notifications],
    );

  const memoizedInitialState = useMemo(
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

  return (
    <Box
      className="server-bound-data-grid"
      data-id={`server-bound-data-grid-${encodeURI(String(url))}`}
      data-parent-id={`server-bound-data-grid-${encodeURI(String(url))}`}
      sx={stableWrapperStyles.box}
    >
      <Paper sx={stableWrapperStyles.paper}>
        <TableContainer style={stableWrapperStyles.table}>
          <DataGridPro<TRowModel>
            filterDebounceMs={300}
            autoHeight={true}
            loading={isLoading}
            logLevel={process.env.NODE_ENV === 'development' ? 'warn' : 'error'}
            columns={columns}
            getRowId={stableGetRowId}
            dataSource={memoizedDataSource}
            initialState={memoizedInitialState}
            pageSizeOptions={StableDefaultPageSizeOptions}
            onDataSourceError={onDataSourceErrorOccurred}
            slotProps={stableSlotProps}
            {...StableDefaultInitialState}
            {...props}
            pagination={true}
          />
        </TableContainer>
      </Paper>
    </Box>
  );
};

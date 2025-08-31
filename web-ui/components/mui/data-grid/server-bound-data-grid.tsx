'use client';
import { useDataSource } from '@/lib/components/mui/data-grid/useDataSource';
import { useGetRowId } from '@/lib/components/mui/data-grid/useGetRowId';
import {
  StableDefaultPageSizeOptions,
  StableDefaultInitialState,
} from '@/lib/components/mui/data-grid/default-values';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import type { SxProps, Theme } from '@mui/material/styles';

import {
  DataGridPro,
  type DataGridProProps,
  type GridGetRowsParams,
  type GridLoadingOverlayVariant,
  type GridUpdateRowError,
  type GridGetRowsError,
  type GridValidRowModel,
} from '@mui/x-data-grid-pro';

import { useCallback, useMemo } from 'react';
import type { ServerBoundDataGridProps } from './types';
import { useNotifications } from '@toolpad/core/useNotifications';

import ServerBoundDataGridPropsSchema from './server-bound-data-grid-props-schema';

const stableWrapperStyles = {
  box: { width: 'auto', maxWidth: 1 } satisfies SxProps<Theme>,
  paper: { width: 'auto', mb: 2, overflow: 'hidden' } satisfies SxProps<Theme>,
  table: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '400px',
    maxHeight: '75%',
  } satisfies SxProps<Theme>,
} as const;

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
        <TableContainer sx={stableWrapperStyles.table}>
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

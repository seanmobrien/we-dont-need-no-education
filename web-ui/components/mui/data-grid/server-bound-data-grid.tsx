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
  GridLoadingOverlayVariant,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';
import { z } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { ServerBoundDataGridProps } from './types';

const ServerBoundDataGridPropsSchema = z.object({
  columns: z
    .array(
      z.object({
        field: z.string(),
        headerName: z.string().optional(),
        type: z.string().optional(),
        width: z.number().optional(),
        sortable: z.boolean().optional(),
        filterable: z.boolean().optional(),
        editable: z.boolean().optional(),
        renderCell: z.function().optional(),
        valueGetter: z.function().optional(),
        valueFormatter: z.function().optional(),
      }),
    )
    .nonempty(),
  url: z
    .string()
    .url()
    .or(
      z.object({
        pathname: z.string(),
        searchParams: z.object({}).catchall(z.any()).optional(),
        hash: z.string().optional(),
      }),
    )
    .optional(),
  // getRecordData: z.function().optional(),
  idColumn: z.string(),
  slotProps: z
    .object({
      loadingOverlay: z
        .object({
          variant: z
            .enum(['circular-progress', 'skeleton', 'linear-progress'])
            .optional(),
          noRowsVariant: z
            .enum(['circular-progress', 'skeleton', 'linear-progress'])
            .optional(),
        })
        .optional(),
    })
    .catchall(z.any())
    .optional(),
  initialState: z
    .object({
      pagination: z
        .object({
          paginationModel: z
            .object({ pageSize: z.number(), page: z.number() })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

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
  // const [hasMounted, setHasMounted] = useState(false);
  const { isLoading, ...memoizedDataSource } = useDataSource({
    url,
  });
  /*
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasMounted) {
        setHasMounted(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [hasMounted]);
  */
  const stableGetRowId = useGetRowId(idColumn);
  const stableSlotProps = useMemo(() => {
    return {
      loadingOverlay: {
        variant: 'circular-progress' as GridLoadingOverlayVariant,
        noRowsVariant: 'skeleton' as GridLoadingOverlayVariant,
      },
      ...slotProps,
    };
  }, [slotProps]);

  useEffect(() => {
    // Handle dynamic changes to URL or columns
    memoizedDataSource.clearLoadError();
  }, [url, columns, memoizedDataSource]);

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
  /*
  if (process.env.IS_BUILDING == '1') {
    console.warn('is building, skipping chat panel rendering');
    return <></>;
  }
  */
  return (
    <Box sx={stableWrapperStyles.box}>
      <Paper sx={stableWrapperStyles.paper}>
        <TableContainer style={stableWrapperStyles.table}>
          <DataGridPro<TRowModel>
            filterDebounceMs={300}
            autoHeight={true}
            pagination
            loading={isLoading}
            logLevel={process.env.NODE_ENV === 'development' ? 'warn' : 'error'}
            columns={columns}
            getRowId={stableGetRowId}
            dataSource={memoizedDataSource}
            initialState={memoizedInitialState}
            pageSizeOptions={StableDefaultPageSizeOptions}
            onDataSourceError={memoizedDataSource.onDataSourceError}
            slotProps={stableSlotProps}
            {...props}
          />
        </TableContainer>
      </Paper>
    </Box>
  );
};

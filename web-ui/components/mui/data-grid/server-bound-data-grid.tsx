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
import { DataGrid, GridColDef } from '@mui/x-data-grid';

import { useMemo, useState } from 'react';

const stableGridLogger = simpleScopedLogger('KeyPointsGrid');

export const ServerBoundDataGrid = ({
  columns,
  url,
  getRecordData,
  idColumn,
}: {
  columns: GridColDef[];
  url: string;
  getRecordData?: (url: string) => Promise<Response>;
  idColumn: string;
}) => {
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
            <DataGrid
              logger={stableGridLogger}
              logLevel="debug"
              columns={columns}
              getRowId={stableGetRowId}
              dataSource={memoizedDataSource}
              initialState={StableDefaultInitialState}
              pageSizeOptions={StableDefaultPageSizeOptions}
              onDataSourceError={memoizedDataSource.onDataSourceError}
            />
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

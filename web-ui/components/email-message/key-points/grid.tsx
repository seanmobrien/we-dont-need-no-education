import {
  Grid2 as Grid,
  Box,
  CircularProgress,
  Paper,
  Typography,
  TableContainer,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid';
import { useCallback, useEffect, useState } from 'react';
import siteBuilder from '@/lib/site-util/url-builder';
import { log } from '@/lib/logger';

export const KeyPointsGrid = ({ emailId }: { emailId: string }) => {
  const [loading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<GridRowModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const columns: GridColDef[] = [
    { field: 'propertyId', headerName: 'Property ID', width: 150 },
    { field: 'policyId', headerName: 'Policy ID', width: 150, editable: true },
    { field: 'value', headerName: 'Value', width: 300, editable: true },
  ];

  const fetchKeyPoints = useCallback(async () => {
    try {
      const url = siteBuilder.api.email.properties(emailId).keyPoints();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      const data = await response.json();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [emailId]);

  const handleProcessRowUpdate = useCallback(
    async (newRow: GridRowModel) => {
      try {
        const url = siteBuilder.api.email
          .properties(emailId)
          .keyPoints(newRow.propertyId);
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRow),
        });
        if (!response.ok) {
          throw new Error(`Failed to update row: ${response.statusText}`);
        }
        return { ...newRow };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      }
    },
    [emailId, setError],
  );

  const handleProcessRowUpdateError = useCallback(
    (error: unknown) => {
      setError(
        error instanceof Error ? error.message : 'Unknown error during update',
      );
      log((l) => l.error('Error during row update:', error));
    },
    [setError],
  );

  useEffect(() => {
    fetchKeyPoints();
  }, [fetchKeyPoints]);

  return (
    <Grid container spacing={2}>
      {loading ? (
        <Box sx={{ color: 'info', textAlign: 'center', width: '100%' }}>
          <CircularProgress />
          <Typography>Loading...</Typography>
        </Box>
      ) : error ? (
        <Box sx={{ color: 'error.main', textAlign: 'center', width: '100%' }}>
          <Typography>Error: {error}</Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
            <TableContainer>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(row) => row.propertyId}
                onProcessRowUpdateError={handleProcessRowUpdateError}
                processRowUpdate={handleProcessRowUpdate}
              />
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Grid>
  );
};

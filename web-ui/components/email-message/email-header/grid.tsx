'use client';
import {
  Grid as Grid,
  Box,
  CircularProgress,
  Paper,
  Typography,
  TableContainer,
} from '@mui/material';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { useCallback, useEffect, useState } from 'react';
import siteBuilder from '@/lib/site-util/url-builder';
import { log } from '@/lib/logger';
import {
  EmailProperty,
  EmailPropertySummary,
  PaginatedResultset,
} from '@/data-models';
import { getEmailHeaders } from '@/lib/api/email/properties/client';
import { LoggedError } from '@/lib/react-util';

const stableRows: Array<EmailProperty> = [];
const stableColumns: GridColDef[] = [
  { field: 'propertyId', headerName: 'Property ID', width: 150 },
  { field: 'typeId', headerName: 'Type ID', width: 150, editable: true },
  { field: 'value', headerName: 'Value', width: 300, editable: true },
];
const getRowId = (row: EmailProperty) => row.propertyId;
export const EmailHeaderGrid = ({ emailId }: { emailId: string }) => {
  const [loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gridApi = useGridApiRef();

  const handleProcessRowUpdate = useCallback(
    async (newRow: EmailProperty) => {
      try {
        const url = siteBuilder.api.email
          .properties(emailId)
          .emailHeader(newRow.propertyId);
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
    if (!gridApi.current) {
      return () => {};
    }

    setIsLoading(true);
    const req = getEmailHeaders({ emailId });
    req
      .then(
        (data: PaginatedResultset<Omit<EmailPropertySummary, 'typeId'>>) => {
          if (!gridApi.current) {
            return;
          }
          const enrichedResults = data.results.map((item) => ({
            ...item,
            value: '', // Provide a default or derived value
          }));
          gridApi.current.updateRows(enrichedResults);
        },
      )
      .catch((err) => {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(err, {
          log: true,
          emailId,
        });
        setError(le.message);
      });
    return () => {
      req.cancel();
    };
  }, [emailId, gridApi]);

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
                apiRef={gridApi}
                rows={stableRows}
                columns={stableColumns}
                getRowId={getRowId}
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

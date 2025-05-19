import type { GridColDef } from '@mui/x-data-grid/models/colDef';

const stableColumns: GridColDef[] = [
  { field: 'responseTimestamp', headerName: 'Timestamp', editable: false },
  {
    field: 'completionPercentage',
    headerName: 'Completion Percentage',
    editable: false,
  },
  {
    field: 'action',
    headerName: 'Action',
    editable: false,
  },
] as const;

export default stableColumns;

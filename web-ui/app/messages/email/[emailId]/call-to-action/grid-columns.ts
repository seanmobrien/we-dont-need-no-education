import type { GridColDef } from '@mui/x-data-grid/models/colDef';

const stableColumns: GridColDef[] = [
  { field: 'openedDate', headerName: 'Opened', editable: false },
  {
    field: 'closedDate',
    headerName: 'Closed Date',
    editable: false,
  },
  {
    field: 'compliancyCloseDate',
    headerName: 'Compliance Date',
    editable: false,
  },
  { field: 'value', headerName: 'Value', width: 300, editable: false },
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
] as const;

export default stableColumns;

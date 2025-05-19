import type { GridColDef } from '@mui/x-data-grid/models/colDef';

const stableColumns: GridColDef[] = [
  { field: 'property_name', headerName: 'Type', editable: false },
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
  { field: 'property_value', headerName: 'Value', width: 300, editable: false },
] as const;

export default stableColumns;

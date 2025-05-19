import type { GridColDef } from '@mui/x-data-grid/models/colDef';

const stableColumns: GridColDef[] = [
  { field: 'property_name', headerName: 'Header', editable: false },
  {
    field: 'property_value',
    headerName: 'Value',
    editable: false,
  },
] as const;

export default stableColumns;

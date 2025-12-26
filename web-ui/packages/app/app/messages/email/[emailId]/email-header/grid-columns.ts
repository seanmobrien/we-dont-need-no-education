import type { GridColDef } from '@mui/x-data-grid/models/colDef';

const stableColumns: GridColDef[] = [
  { field: 'typeName', headerName: 'Header', editable: false, width: 200 },
  {
    field: 'value',
    headerName: 'Value',
    editable: false,
    flex: 1
  },
] as const;

export default stableColumns;

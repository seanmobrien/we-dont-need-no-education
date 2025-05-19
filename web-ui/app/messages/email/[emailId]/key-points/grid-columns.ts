import type { GridColDef } from '@mui/x-data-grid/models/colDef';

const stableColumns: GridColDef[] = [
  { field: 'property_value', headerName: 'Value', width: 300, editable: false },
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
  {
    field: 'relevance',
    headerName: 'Relevance',
    editable: false,
  },
  {
    field: 'compliance',
    headerName: 'Compliance',
    editable: false,
  },
  {
    field: 'severity_ranking',
    headerName: 'Severity Ranking',
    editable: false,
  },
  {
    field: 'inferred',
    headerName: 'Inferred',
    type: 'boolean',
    editable: false,
  },
] as const;

export default stableColumns;

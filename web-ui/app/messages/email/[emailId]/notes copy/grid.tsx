'use client';
import type { GridColDef } from '@mui/x-data-grid/models/colDef';
import { EmailPropertyDataGrid } from '/components/mui/data-grid/email-properties/email-property-grid';
import { SharedCellDefinitions } from '/components/mui/data-grid';

const stableColumns: GridColDef[] = [
  { field: 'typeName', headerName: 'Type', editable: false, width: 150 },
  { field: 'value', headerName: 'Value', flex: 1, editable: false },
  SharedCellDefinitions.created_on,
  SharedCellDefinitions.policyBasis,
  SharedCellDefinitions.tags,
] as const;

const stableInitialState = {
  columns: {
    columnVisibilityModel: {
      created_on: false,
      policy_basis: false,
      tags: false,
    },
  },
};

export const RelatedDocumentsGrid = () => {
  return (
    <EmailPropertyDataGrid
      property="related-documents"
      columns={stableColumns}
      initialState={stableInitialState}
    />
  );
};

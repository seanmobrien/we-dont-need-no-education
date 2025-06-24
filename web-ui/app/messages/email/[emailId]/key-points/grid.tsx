'use client';
import {
  EmailPropertyDataGrid,
  SharedCellDefinitions,
} from '@/components/mui/data-grid';
import renderProgress from '@/components/mui/data-grid/cellRenderers/progress/render';
import type { GridColDef } from '@mui/x-data-grid/models/colDef';
import { KeyPointsPanel } from './panel';
import { DataGridProProps } from '@mui/x-data-grid-pro';
import { useCallback } from 'react';

const stableColumns: GridColDef[] = [
  { field: 'value', headerName: 'Value', flex: 1, editable: false },
  {
    field: 'relevance',
    headerName: 'Relevance',
    editable: false,
    renderCell: renderProgress,
  },
  SharedCellDefinitions.severity,
  SharedCellDefinitions.inferred,
  SharedCellDefinitions.policyBasis,
  SharedCellDefinitions.tags,
] as const;

const stableInitialState = {
  columns: {
    columnVisibilityModel: {
      tags: false,
      policy_basis: false,
    },
  },
};

const KeyPointsGrid = () => {
  const getDetailPanelContent = useCallback<
    NonNullable<DataGridProProps['getDetailPanelContent']>
  >(({ row }) => <KeyPointsPanel row={row} />, []);

  const getDetailPanelHeight = useCallback(() => 'auto', []);

  return (
    <EmailPropertyDataGrid
      property="key-points"
      columns={stableColumns}
      initialState={stableInitialState}
      getDetailPanelContent={getDetailPanelContent}
      getDetailPanelHeight={getDetailPanelHeight}
    />
  );
};

export default KeyPointsGrid;

'use client';

import {
  SharedCellDefinitions,
  valueGetterDate,
} from '@/components/mui/data-grid';
import { EmailPropertyDataGrid } from '@/components/mui/data-grid/email-properties/email-property-grid';
import { ResponsiveActionPanel } from './panel';
import { DataGridProProps } from '@mui/x-data-grid-pro';
import { useCallback } from 'react';

import type { GridColDef } from '@mui/x-data-grid/models/colDef';

const stableColumns: GridColDef[] = [
  {
    field: 'responseTimestamp',
    headerName: 'Timestamp',
    editable: false,
    type: 'date',
    valueGetter: valueGetterDate,
  },

  {
    field: 'value',
    headerName: 'Action',
    editable: false,
    flex: 1,
  },
  SharedCellDefinitions.compliance.chapter_13,
  SharedCellDefinitions.compliance.chapter_13_reasons,
  SharedCellDefinitions.severity,
  SharedCellDefinitions.severityReason,
  SharedCellDefinitions.sentiment,
  SharedCellDefinitions.sentimentReasons,
  SharedCellDefinitions.policyBasis,
  SharedCellDefinitions.tags,
] as const;

const stableInitialState = {
  columns: {
    columnVisibilityModel: {
      responseTimestamp: false,
      compliance_chapter_13_reasons: false,
      severity_reason: false,
      sentiment_reasons: false,
      tags: false,
      policy_basis: false,
    },
  },
};

const CtaResponseGrid = () => {
  const getDetailPanelContent = useCallback<
    NonNullable<DataGridProProps['getDetailPanelContent']>
  >(({ row }) => <ResponsiveActionPanel row={row} />, []);

  const getDetailPanelHeight = useCallback(() => 'auto', []);

  return (
    <EmailPropertyDataGrid
      property="call-to-action-response"
      columns={stableColumns}
      initialState={stableInitialState}
      getDetailPanelContent={getDetailPanelContent}
      getDetailPanelHeight={getDetailPanelHeight}
    />
  );
};

export default CtaResponseGrid;

'use client';
import {
  defineReasonsColumn,
  EmailPropertyDataGrid,
  SharedCellDefinitions,
  valueFormatterPercentageIntegerBaseTen,
  valueGetterDate,
} from '/components/mui/data-grid';
import renderProgress from '/components/mui/data-grid/cellRenderers/progress/render';
import { CallToActionDetails } from '/data-models/api/email-properties/extended-properties';
import type { GridColDef } from '@mui/x-data-grid/models/colDef';
import { CallToActionPanel } from './panel';
import { DataGridProProps } from '@mui/x-data-grid-pro';
import { useCallback } from 'react';

const stableColumns: GridColDef[] = [
  { field: 'value', headerName: 'CTA', flex: 1, editable: false },
  {
    field: 'opened_date',
    headerName: 'Opened',
    description: 'Date when the call to action was opened',
    editable: false,
    type: 'date',
    valueGetter: valueGetterDate,
  },
  {
    field: 'close_date',
    description: 'Date the CTA closed, either due to inaction or fulfillment',
    headerName: 'Closed',
    editable: false,
    type: 'date',
    valueGetter: valueGetterDate,
  },
  {
    field: 'compliancy_close_date',
    headerName: 'Comply By',
    description: 'Date Close date required for compliance',
    type: 'date',
    editable: false,
    valueGetter: valueGetterDate,
  },
  {
    field: 'compliance_date_enforceable',
    headerName: 'Enforceable Date',
    description: 'Date when compliance becomes enforceable',
    type: 'boolean',
    editable: false,
  },

  SharedCellDefinitions.severity,
  SharedCellDefinitions.severityReason,
  {
    field: 'completion_percentage',
    headerName: 'Complete',
    description: 'Percentage of the CTA that has been completed',
    width: 80,
    editable: false,
    type: 'number',
    renderCell: renderProgress,
  },
  {
    field: 'title_ix_applicable',
    headerName: 'Title IX Applicable',
    description: 'Indicates if Title IX is applicable',
    editable: false,
    type: 'number',
    valueFormatter: valueFormatterPercentageIntegerBaseTen,
  },
  defineReasonsColumn({
    field: 'title_ix_applicable_reasons',
    headerName: 'Title IX',
    description: 'Title IX Applicable Reasons',
  }),
  SharedCellDefinitions.compliance.chapter_13,
  SharedCellDefinitions.compliance.chapter_13_reasons,
  {
    field: 'closure_actions',
    headerName: 'Closure',
    description: 'Actions expected to be able to reasonably dclose the CTA',
    editable: false,
  },
  SharedCellDefinitions.sentiment,
  SharedCellDefinitions.sentimentReasons,
  //
  // SharedCellDefinitions.complianceRating,
  SharedCellDefinitions.policyBasis,
  SharedCellDefinitions.tags,
] as const;

const stableInitialState = {
  columns: {
    columnVisibilityModel: {
      closure_actions: false,
      compliance_chapter_13_reasons: false,
      sentiment_reasons: false,
      title_ix_applicable: false,
      title_ix_applicable_reasons: false,
      severity_reason: false,
      compliance_date_enforceable: false,
      compliancy_close_date: false,
      tags: false,
      policy_basis: false,
    },
  },
};

const CtaGrid = () => {
  const getDetailPanelContent = useCallback<
    NonNullable<DataGridProProps['getDetailPanelContent']>
  >(({ row }) => <CallToActionPanel row={row} />, []);

  const getDetailPanelHeight = useCallback(() => 'auto', []);

  return (
    <EmailPropertyDataGrid<CallToActionDetails>
      property="call-to-action"
      columns={stableColumns}
      initialState={stableInitialState}
      getDetailPanelContent={getDetailPanelContent}
      getDetailPanelHeight={getDetailPanelHeight}
    />
  );
};

export default CtaGrid;

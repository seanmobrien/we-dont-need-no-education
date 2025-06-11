'use client';
import { EmailPropertyDataGrid } from '@/components/mui/data-grid/email-properties/email-property-grid';
import { EmailHeaderPanel } from './panel';
import { DataGridProProps } from '@mui/x-data-grid-pro';
import { useCallback } from 'react';
import stableColumns from './grid-columns';

const stableInitialState = {
  columns: {
    columnVisibilityModel: {},
  },
};

export const EmailHeaderGrid = () => {
  const getDetailPanelContent = useCallback<
    NonNullable<DataGridProProps['getDetailPanelContent']>
  >(({ row }) => <EmailHeaderPanel row={row} />, []);

  const getDetailPanelHeight = useCallback(() => 'auto', []);

  return (
    <EmailPropertyDataGrid
      property="email-headers"
      columns={stableColumns}
      initialState={stableInitialState}
      getDetailPanelContent={getDetailPanelContent}
      getDetailPanelHeight={getDetailPanelHeight}
    />
  );
};
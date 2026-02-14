'use client';
import { EmailPropertyDataGrid } from '@/components/mui/data-grid/email-properties/email-property-grid';
import { SharedCellDefinitions } from '@/components/mui/data-grid';
import { NotesPanel } from './panel';
import { useCallback } from 'react';
const stableColumns = [
    { field: 'typeName', headerName: 'Type', editable: false, width: 150 },
    { field: 'value', headerName: 'Value', flex: 1, editable: false },
    SharedCellDefinitions.created_on,
    SharedCellDefinitions.policyBasis,
    SharedCellDefinitions.tags,
];
const stableInitialState = {
    columns: {
        columnVisibilityModel: {
            created_on: false,
            policy_basis: false,
            tags: false,
        },
    },
};
export const NoteGrid = () => {
    const getDetailPanelContent = useCallback(({ row }) => <NotesPanel row={row}/>, []);
    const getDetailPanelHeight = useCallback(() => 'auto', []);
    return (<EmailPropertyDataGrid property="notes" columns={stableColumns} initialState={stableInitialState} getDetailPanelContent={getDetailPanelContent} getDetailPanelHeight={getDetailPanelHeight}/>);
};
//# sourceMappingURL=grid.jsx.map
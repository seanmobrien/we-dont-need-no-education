'use client';
import { EmailPropertyDataGrid, SharedCellDefinitions, } from '@/components/mui/data-grid';
import renderProgress from '@/components/mui/data-grid/cellRenderers/progress/render';
import { KeyPointsPanel } from './panel';
import { useCallback } from 'react';
const stableColumns = [
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
];
const stableInitialState = {
    columns: {
        columnVisibilityModel: {
            tags: false,
            policy_basis: false,
        },
    },
};
const KeyPointsGrid = () => {
    const getDetailPanelContent = useCallback(({ row }) => <KeyPointsPanel row={row}/>, []);
    const getDetailPanelHeight = useCallback(() => 'auto', []);
    return (<EmailPropertyDataGrid property="key-points" columns={stableColumns} initialState={stableInitialState} getDetailPanelContent={getDetailPanelContent} getDetailPanelHeight={getDetailPanelHeight}/>);
};
export default KeyPointsGrid;
//# sourceMappingURL=grid.jsx.map
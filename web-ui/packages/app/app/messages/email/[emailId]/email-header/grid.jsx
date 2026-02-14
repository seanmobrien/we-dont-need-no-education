'use client';
import { EmailPropertyDataGrid } from '@/components/mui/data-grid/email-properties/email-property-grid';
import stableColumns from './grid-columns';
export const EmailHeaderGrid = () => {
    return (<EmailPropertyDataGrid property="email-header" columns={stableColumns}/>);
};
//# sourceMappingURL=grid.jsx.map
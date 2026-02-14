'use client';
import { useCallback, useMemo, useState } from 'react';
import { ServerBoundDataGrid } from '../server-bound-data-grid';
import siteBuilder from '@/lib/site-util/url-builder';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import EmailPropertyToolbar from './email-property-toolbar';
export const EmailPropertyDataGrid = ({ property, maxHeight = undefined, ...props }) => {
    const [includeAttachments, setIncludeAttachments] = useState(true);
    const onSetIncludeAttachments = useCallback((event) => {
        if (includeAttachments === event.target.checked) {
            return;
        }
        setIncludeAttachments(event.target.checked);
    }, [includeAttachments]);
    const { emailId } = useParams();
    const url = siteBuilder.api.email
        .properties(emailId)
        .page(property, { attachments: includeAttachments })
        .toString();
    const containerSx = useMemo(() => ({
        maxHeight,
    }), [maxHeight]);
    const Toolbar = () => {
        return (<EmailPropertyToolbar includeAttachments={includeAttachments} setIncludeAttachments={onSetIncludeAttachments}/>);
    };
    return (<Box sx={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '100%',
            ...containerSx,
        }}>
      <ServerBoundDataGrid {...props} url={url} idColumn="propertyId" slots={{ toolbar: Toolbar }} showToolbar/>
    </Box>);
};
//# sourceMappingURL=email-property-grid.jsx.map
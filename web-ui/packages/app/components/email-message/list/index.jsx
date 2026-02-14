'use client';
import { useMemo, useCallback, } from 'react';
import { ServerBoundDataGrid } from '@/components/mui/data-grid/server-bound-data-grid';
import siteMap from '@/lib/site-util/url-builder';
import Box from '@mui/material/Box';
import AttachEmailIcon from '@mui/icons-material/AttachEmail';
import KeyIcon from '@mui/icons-material/Key';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CallToActionIcon from '@mui/icons-material/CallToAction';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Link from '@mui/material/Link';
import EmailDetailPanel from './email-detail-panel';
import { usePrefetchEmail } from '@/lib/hooks/use-email';
const stableSx = {
    containerBase: {
        display: 'flex',
        flexDirection: 'column',
        width: 1,
    },
    subjectLink: {
        color: 'primary.main',
        textDecoration: 'none',
        '&:hover': { textDecoration: 'underline' },
        '&:focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
        },
    },
};
const createColumns = (prefetchEmail) => [
    {
        field: 'count_attachments',
        headerName: 'Attachments',
        description: '# attachments',
        renderHeader: () => <AttachEmailIcon fontSize="small"/>,
        valueFormatter: (v) => (v ? v : ''),
        width: 30,
        minWidth: 48,
        headerAlign: 'center',
        align: 'center',
        type: 'number',
    },
    {
        field: 'threadId',
        headerName: 'Thread',
        editable: false,
        width: 20,
        minWidth: 56,
        headerAlign: 'center',
        align: 'center',
    },
    {
        field: 'sender',
        headerName: 'From',
        editable: false,
        flex: 0.2,
        valueGetter: (sender) => {
            return sender ? sender.name : 'Unknown';
        },
    },
    {
        field: 'subject',
        headerName: 'Subject',
        editable: false,
        flex: 1,
        renderCell: (params) => {
            return params.value ? (<Link onMouseEnter={() => prefetchEmail(params.row.emailId)} component={NextLink} href={siteMap.messages.email(params.row.emailId).toString()} title="Open email message" aria-label={params.value ? `Open email: ${params.value}` : 'Open email'} sx={stableSx.subjectLink}>
          {params.value}
        </Link>) : (<></>);
        },
    },
    {
        field: 'count_kpi',
        description: '# KPI',
        renderHeader: () => <KeyIcon fontSize="small"/>,
        valueFormatter: (v) => (v ? v : '-'),
        width: 10,
        minWidth: 56,
        headerAlign: 'center',
        align: 'center',
        type: 'number',
    },
    {
        field: 'count_notes',
        description: '# Notes',
        renderHeader: () => <TextSnippetIcon fontSize="small"/>,
        valueFormatter: (v) => (v ? v : '-'),
        width: 10,
        minWidth: 56,
        headerAlign: 'center',
        align: 'center',
        type: 'number',
    },
    {
        field: 'count_cta',
        description: '# CTA',
        renderHeader: () => <CallToActionIcon fontSize="small"/>,
        valueGetter: (v, row) => {
            return (v ?? 0) + (row.count_responsive_actions ?? 0);
        },
        valueFormatter: (v) => (v ? v : '-'),
        width: 10,
        minWidth: 56,
        headerAlign: 'center',
        align: 'center',
        type: 'number',
    },
    {
        field: 'sentOn',
        headerName: 'Sent',
        editable: false,
        width: 160,
        type: 'date',
        valueGetter: (v) => {
            return v ? new Date(v) : v;
        },
        valueFormatter: (v) => {
            if (isNaN(v.getTime()))
                return '';
            const mm = String(v.getMonth() + 1).padStart(2, '0');
            const dd = String(v.getDate()).padStart(2, '0');
            const yyyy = v.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
        },
    },
];
export const EmailList = ({ maxHeight = undefined, onRowDoubleClick: onRowDoubleClickProps, ...props }) => {
    const containerSx = useMemo(() => ({
        maxHeight,
    }), [maxHeight]);
    const { push } = useRouter();
    const prefetchEmail = usePrefetchEmail();
    const onRowDoubleClick = useCallback((params, event, details) => {
        if (onRowDoubleClickProps) {
            onRowDoubleClickProps(params, event, details);
        }
        if (!event.isPropagationStopped()) {
            const emailId = params.row.emailId;
            if (emailId) {
                push(siteMap.messages.email(emailId));
            }
        }
    }, [onRowDoubleClickProps, push]);
    const getDetailPanelContent = useCallback(({ row }) => <EmailDetailPanel row={row}/>, []);
    const getDetailPanelHeight = useCallback(() => 'auto', []);
    const columns = useMemo(() => createColumns(prefetchEmail), [prefetchEmail]);
    return (<>
      <Box sx={[stableSx.containerBase, containerSx]}>
        <ServerBoundDataGrid {...props} columns={columns} url={siteMap.api.email.url} idColumn="emailId" onRowDoubleClick={onRowDoubleClick} getDetailPanelContent={getDetailPanelContent} getDetailPanelHeight={getDetailPanelHeight}/>
      </Box>
    </>);
};
export default EmailList;
//# sourceMappingURL=index.jsx.map
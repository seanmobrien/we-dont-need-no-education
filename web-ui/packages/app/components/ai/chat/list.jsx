'use client';
import { useMemo, useCallback } from 'react';
import { ServerBoundDataGrid } from '@/components/mui/data-grid/server-bound-data-grid';
import siteMap from '@/lib/site-util/url-builder';
import Box from '@mui/material/Box';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import siteBuilder from '@/lib/site-util/url-builder';
const stableColumns = [
    {
        field: 'title',
        headerName: 'Chat Title',
        editable: false,
        flex: 1,
        renderCell: (params) => {
            const title = params.value || `Chat ${params.row.id.slice(-8)}`;
            return (<Link href={siteBuilder.messages.chat.page(encodeURIComponent(params.row.id))} title="Open chat" style={{
                    textDecoration: 'none',
                }} onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')} onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}>
          {title}
        </Link>);
        },
    },
    {
        field: 'totalTurns',
        headerName: 'Turns',
        editable: false,
    },
    {
        field: 'totalMessages',
        headerName: 'Messages',
        editable: false,
    },
    {
        field: 'totalTokens',
        headerName: 'Tokens',
        editable: false,
    },
    {
        field: 'createdAt',
        headerName: 'Created',
        editable: false,
        width: 160,
        type: 'date',
        valueGetter: (v) => {
            return v ? new Date(v) : v;
        },
        valueFormatter: (v) => {
            if (!v || isNaN(v.getTime()))
                return '';
            const mm = String(v.getMonth() + 1).padStart(2, '0');
            const dd = String(v.getDate()).padStart(2, '0');
            const yyyy = v.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
        },
    },
];
export const ChatList = ({ maxHeight = undefined, viewType = 'user', onRowDoubleClick: onRowDoubleClickProps, ...props }) => {
    const containerSx = useMemo(() => ({
        maxHeight,
    }), [maxHeight]);
    const { push } = useRouter();
    const gridUrl = useMemo(() => {
        const url = new URL(siteMap.api.ai.chat.history().toString(), window.location.origin);
        if (viewType !== 'user') {
            url.searchParams.set('viewType', viewType);
        }
        return url.toString();
    }, [viewType]);
    const onRowDoubleClick = useCallback((params, event, details) => {
        if (onRowDoubleClickProps) {
            onRowDoubleClickProps(params, event, details);
        }
        if (!event.isPropagationStopped()) {
            const chatId = params.row.id;
            if (chatId) {
                push(siteBuilder.messages.chat.detail(encodeURIComponent(chatId)));
            }
        }
    }, [onRowDoubleClickProps, push]);
    return (<>
      <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            ...containerSx,
        }}>
        <ServerBoundDataGrid {...props} columns={stableColumns} url={gridUrl} idColumn="id" onRowDoubleClick={onRowDoubleClick}/>
      </Box>
    </>);
};
export default ChatList;
//# sourceMappingURL=list.jsx.map
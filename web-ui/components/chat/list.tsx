'use client';
import { JSX, useMemo, useCallback } from 'react';
import { ServerBoundDataGrid } from '@/components/mui/data-grid/server-bound-data-grid';
import siteMap from '@/lib/site-util/url-builder';
import { Box } from '@mui/material';
import {
  GridCallbackDetails,
  GridColDef,
  GridRowParams,
  MuiEvent,
} from '@mui/x-data-grid-pro';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Chat summary interface matching the API response
 */
interface ChatSummary {
  id: string;
  title: string | null;
  userId: number;
  createdAt: string;
}

/**
 * Props for the chat grid component
 */
interface ChatGridProps {
  maxHeight?: number | string;
  onRowDoubleClick?: (
    params: GridRowParams<ChatSummary>,
    event: MuiEvent<React.MouseEvent<HTMLElement, MouseEvent>>,
    details: GridCallbackDetails,
  ) => void;
}

/**
 * Defines the column configuration for the chat history list grid.
 */
const stableColumns: GridColDef<ChatSummary>[] = [
  {
    field: 'title',
    headerName: 'Chat Title',
    editable: false,
    flex: 1,
    renderCell: (params) => {
      const title = params.value || `Chat ${params.row.id.slice(-8)}`;
      return (
        <Link
          href={`/chat/${params.row.id}`}
          title="Open chat"
          style={{
            color: '#2563eb',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
          onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
        >
          {title}
        </Link>
      );
    },
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    editable: false,
    width: 160,
    type: 'date',
    valueGetter: (v: string | Date) => {
      return v ? new Date(v) : v;
    },
    valueFormatter: (v: Date) => {
      if (!v || isNaN(v.getTime())) return '';
      const mm = String(v.getMonth() + 1).padStart(2, '0');
      const dd = String(v.getDate()).padStart(2, '0');
      const yyyy = v.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    },
  },
];

/**
 * Displays a list of chat histories in a data grid.
 *
 * @param {ChatGridProps} props - Props for configuring the chat data grid.
 * @returns {JSX.Element} The rendered chat list component.
 */
export const ChatList = ({
  maxHeight = undefined,
  onRowDoubleClick: onRowDoubleClickProps,
  ...props
}: ChatGridProps): JSX.Element => {
  const containerSx = useMemo(
    () => ({
      maxHeight,
    }),
    [maxHeight],
  );
  const { push } = useRouter();

  const onRowDoubleClick = useCallback(
    (
      params: GridRowParams<ChatSummary>,
      event: MuiEvent<React.MouseEvent<HTMLElement, MouseEvent>>,
      details: GridCallbackDetails,
    ) => {
      if (onRowDoubleClickProps) {
        onRowDoubleClickProps(params, event, details);
      }
      if (!event.isPropagationStopped()) {
        const chatId = params.row.id;
        if (chatId) {
          push(`/chat/${chatId}`);
        }
      }
    },
    [onRowDoubleClickProps, push],
  );

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          ...containerSx,
        }}
      >
        <ServerBoundDataGrid<ChatSummary>
          {...props}
          columns={stableColumns}
          url={siteMap.api.ai.chat.history().toString()}
          idColumn="id"
          onRowDoubleClick={onRowDoubleClick}
        />
      </Box>
    </>
  );
};

export default ChatList;
'use client';
import {
  JSX,
  useMemo,
  useCallback,
  MouseEvent as ReactMouseEvent,
  ElementType,
} from 'react';
import { ServerBoundDataGrid } from '@/components/mui/data-grid/server-bound-data-grid';
import siteMap from '@/lib/site-util/url-builder';
import Box from '@mui/material/Box';
import { EmailGridProps } from '@/components/mui/data-grid/types';
import {
  GridCallbackDetails,
  GridColDef,
  GridRowParams,
  MuiEvent,
  DataGridProProps,
} from '@mui/x-data-grid-pro';
import { ContactSummary } from '@/data-models/api/contact';
import { EmailMessageSummary } from '@/data-models/api/email-message';
import AttachEmailIcon from '@mui/icons-material/AttachEmail';
import KeyIcon from '@mui/icons-material/Key';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CallToActionIcon from '@mui/icons-material/CallToAction';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Link from '@mui/material/Link';
import type { SxProps, Theme } from '@mui/material/styles';
import EmailDetailPanel from './email-detail-panel';
import { usePrefetchEmail } from '@/lib/hooks/use-email';

const stableSx = {
  containerBase: {
    display: 'flex',
    flexDirection: 'column',
    width: 1,
  } satisfies SxProps<Theme>,
  subjectLink: {
    color: 'primary.main',
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline' },
    '&:focusVisible': {
      outline: '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: 2,
    },
  } satisfies SxProps<Theme>,
} as const;

/**
 * Defines the column configuration for the email message list grid.
 *
 * Each column is represented as a `GridColDef` object specifying:
 * - `field`: The property name in the data source.
 * - `headerName`: The display name for the column header.
 * - `editable`: Whether the column is editable by the user.
 *
 * Columns included:
 * - `sender`: Displays the sender of the email.
 * - `subject`: Displays the subject of the email.
 * - `sentDate`: Displays the date the email was sent.
 */
const createColumns = (
  prefetchEmail: (emailId: string) => void,
): GridColDef<EmailMessageSummary>[] => [
  {
    field: 'count_attachments',
    headerName: 'Attachments',
    description: '# attachments',
    renderHeader: () => <AttachEmailIcon fontSize="small" />,
    valueFormatter: (v: number) => (v ? v : ''),
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
    valueGetter: (sender: ContactSummary) => {
      return sender ? sender.name : 'Unknown';
    },
  },
  {
    field: 'subject',
    headerName: 'Subject',
    editable: false,
    flex: 1,
    renderCell: (params) => {
      return params.value ? (
        <Link
          onMouseEnter={() => prefetchEmail(params.row.emailId)}
          component={NextLink as unknown as ElementType}
          href={siteMap.messages.email(params.row.emailId).toString()}
          title="Open email message"
          aria-label={
            params.value ? `Open email: ${params.value}` : 'Open email'
          }
          sx={stableSx.subjectLink}
        >
          {params.value}
        </Link>
      ) : (
        <></>
      );
    },
  },
  {
    field: 'count_kpi',
    description: '# KPI',
    renderHeader: () => <KeyIcon fontSize="small" />,
    valueFormatter: (v: number) => (v ? v : '-'),
    width: 10,
    minWidth: 56,
    headerAlign: 'center',
    align: 'center',
    type: 'number',
  },
  {
    field: 'count_notes',
    description: '# Notes',
    renderHeader: () => <TextSnippetIcon fontSize="small" />,
    valueFormatter: (v: number) => (v ? v : '-'),
    width: 10,
    minWidth: 56,
    headerAlign: 'center',
    align: 'center',
    type: 'number',
  },
  {
    field: 'count_cta',
    description: '# CTA',
    renderHeader: () => <CallToActionIcon fontSize="small" />,
    valueGetter: (v: number, row: EmailMessageSummary) => {
      return (v ?? 0) + (row.count_responsive_actions ?? 0);
    },
    valueFormatter: (v: number) => (v ? v : '-'),
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
    valueGetter: (v: string | Date) => {
      return v ? new Date(v) : v;
    },
    valueFormatter: (v: Date) => {
      if (isNaN(v.getTime())) return '';
      const mm = String(v.getMonth() + 1).padStart(2, '0');
      const dd = String(v.getDate()).padStart(2, '0');
      const yyyy = v.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    },
  },
];

/**
 * Displays a list of email messages in a data grid with columns for sender, subject, and sent date.
 *
 * @param {EmailGridProps} props - Props for configuring the email data grid.
 * @param {number | string | undefined} [maxHeight] - Optional maximum height for the grid container.
 * @returns {JSX.Element} The rendered email list component.
 *
 * @remarks
 * - Uses a server-bound data grid to fetch and display email data.
 * - Columns are fixed and non-editable.
 * - The grid fetches data from the email API endpoint defined in the site map.
 */
export const EmailList = ({
  maxHeight = undefined,
  onRowDoubleClick: onRowDoubleClickProps,
  ...props
}: EmailGridProps): JSX.Element => {
  const containerSx = useMemo(
    () => ({
      maxHeight,
    }),
    [maxHeight],
  );
  const { push } = useRouter();
  const prefetchEmail = usePrefetchEmail();

  const onRowDoubleClick = useCallback(
    (
      params: GridRowParams<EmailMessageSummary>,
      event: MuiEvent<ReactMouseEvent<HTMLElement, MouseEvent>>,
      details: GridCallbackDetails,
    ) => {
      if (onRowDoubleClickProps) {
        onRowDoubleClickProps(params, event, details);
      }
      if (!event.isPropagationStopped()) {
        const emailId = params.row.emailId;
        if (emailId) {
          push(siteMap.messages.email(emailId));
        }
      }
    },
    [onRowDoubleClickProps, push],
  );

  // Add detail panel support
  const getDetailPanelContent = useCallback<
    NonNullable<DataGridProProps['getDetailPanelContent']>
  >(({ row }) => <EmailDetailPanel row={row} />, []);

  const getDetailPanelHeight = useCallback(() => 'auto', []);

  // Create columns with prefetching capability
  const columns = useMemo(() => createColumns(prefetchEmail), [prefetchEmail]);

  return (
    <>
      <Box sx={[stableSx.containerBase, containerSx]}>
        <ServerBoundDataGrid<EmailMessageSummary>
          {...props}
          columns={columns}
          url={siteMap.api.email.url}
          idColumn="emailId"
          onRowDoubleClick={onRowDoubleClick}
          getDetailPanelContent={getDetailPanelContent}
          getDetailPanelHeight={getDetailPanelHeight}
        />
      </Box>
    </>
  );
};

export default EmailList;

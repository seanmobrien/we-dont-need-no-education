'use client';
import { JSX, useMemo, useCallback } from 'react';
import { ServerBoundDataGrid } from '@/components/mui/data-grid/server-bound-data-grid';
import siteMap from '@/lib/site-util/url-builder';
import classnames, {
  display,
  flexDirection,
  width,
} from '@/tailwindcss.classnames';
import { Box } from '@mui/material';
import { EmailGridProps } from '@/components/mui/data-grid/types';
import {
  GridCallbackDetails,
  GridColDef,
  GridRowParams,
  MuiEvent,
} from '@mui/x-data-grid-pro';
import { ContactSummary, EmailMessageSummary } from '@/data-models';
import AttachEmailIcon from '@mui/icons-material/AttachEmail';
import KeyIcon from '@mui/icons-material/Key';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CallToActionIcon from '@mui/icons-material/CallToAction';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
const stableColumns: GridColDef<EmailMessageSummary>[] = [
  {
    field: 'count_attachments',
    headerName: 'Attachments',
    description: '# attachments',
    renderHeader: () => <AttachEmailIcon fontSize="small" />,
    valueFormatter: (v: number) => (v ? v : ''),
    width: 30,
    type: 'number',
  },
  {
    field: 'threadId',
    headerName: 'Thread',
    editable: false,
    width: 20,
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
          href={siteMap.messages.email(params.row.emailId).toString()}
          title="Open email message"
          className="text-blue-600 hover:underline"
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
    type: 'number',
  },
  {
    field: 'count_notes',
    description: '# Notes',
    renderHeader: () => <TextSnippetIcon fontSize="small" />,
    valueFormatter: (v: number) => (v ? v : '-'),
    width: 10,
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

  const onRowDoubleClick = useCallback(
    (
      params: GridRowParams<EmailMessageSummary>,
      event: MuiEvent<React.MouseEvent<HTMLElement, MouseEvent>>,
      details: GridCallbackDetails,
    ) => {
      if (onRowDoubleClickProps) {
        onRowDoubleClickProps(params, event, details);
      }
      if (!event.isPropagationStopped()) {
        const emailId = params.row.emailId;
        if (emailId) {
          push(siteMap.messages.email(emailId).toString());
        }
      }
    },
    [onRowDoubleClickProps, push],
  );

  return (
    <Box
      className={classnames(
        display('flex'),
        flexDirection('flex-col'),
        width('w-full'),
      )}
      sx={containerSx}
    >
      <ServerBoundDataGrid<EmailMessageSummary>
        {...props}
        columns={stableColumns}
        url={siteMap.api.email.url}
        idColumn="emailId"
        onRowDoubleClick={onRowDoubleClick}
      />
    </Box>
  );
};

export default EmailList;

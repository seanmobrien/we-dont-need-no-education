import { EmailMessageSummary } from '@/data-models/api/email-message';
import { getEmailList } from '@/lib/api/client';
import Link from 'next/link';
import { Dispatch, useState, useEffect } from 'react';
import { typography } from 'tailwindcss-classnames';
import siteMap from '@/lib/site-util/url-builder';
import {
  ICancellablePromiseExt,
  isOperationCancelledError,
} from '@/lib/typescript';
import UnsubscribeIcon from '@mui/icons-material/Unsubscribe';
import {
  Grid as Grid,
  Box,
  CircularProgress,
  Paper,
  TableContainer,
  Table,
  TableBody,
  TableRow,
} from '@mui/material';
import { HeadCell, EnhancedTableHead } from '@/components/general';
import { TableCell } from '@mui/material';

const textGray600 = typography('text-gray-600');

const headCells: HeadCell[] = [
  { id: 'sender', numeric: false, disablePadding: true, label: 'Sender' },
  {
    id: 'subject',
    numeric: false,
    disablePadding: false,
    label: 'Subject',
    maxWidth: '180px',
  },
  {
    id: 'receivedDate',
    numeric: false,
    disablePadding: false,
    label: 'Received Date',
  },
  { id: 'callsToAction', numeric: false, disablePadding: false, label: 'CTA' },
  {
    id: 'complianceScore',
    numeric: false,
    disablePadding: false,
    label: 'Compliance Score',
  },
];

const EmailListServer = ({
  pageNumber = 1,
  perPage,
  setError,
  setLoading,
  loading,
}: {
  perPage: number;
  pageNumber: number;
  setError: Dispatch<string>;
  loading: boolean;
  setLoading: Dispatch<boolean>;
}) => {
  const [emails, setEmails] = useState<ReadonlyArray<EmailMessageSummary>>([]);

  useEffect(() => {
    let request: ICancellablePromiseExt<void> | null = getEmailList({
      page: pageNumber,
      num: perPage,
    })
      .then((data) => {
        setEmails(data);
      })
      .catch((e) => {
        if (!isOperationCancelledError(e)) {
          setError('Error fetching emails.');
        }
      })
      .finally(() => {
        setLoading(false);
        request = null;
      });
    return () => {
      request?.cancel();
    };
  }, [setEmails, pageNumber, perPage, setError, setLoading]);

  return loading ? (
    <p className={textGray600}>Loading emails...</p>
  ) : (
    <>
      <Grid container spacing={2}>
        {loading && (
          <Grid size={12}>
            <Box sx={{ color: 'info', textAlign: 'center' }}>
              <CircularProgress />
              Loading...
            </Box>
          </Grid>
        )}
        {!emails?.length && (
          <Grid size={12}>
            <Box sx={{ color: 'warning', textAlign: 'center' }}>
              <UnsubscribeIcon />
              No emails found.
            </Box>
          </Grid>
        )}
        {emails?.length && (
          <Box sx={{ width: '100%' }}>
            <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 430 }}>
                <Table
                  stickyHeader
                  sx={{ width: '100%' }}
                  aria-labelledby="tableTitle"
                  size={'medium'}
                >
                  <EnhancedTableHead
                    headCells={headCells}
                    numSelected={0}
                    rowCount={emails.length}
                  />
                  <TableBody>
                    {emails.map(({ sender, emailId, subject, sentOn }) => (
                      <TableRow key={emailId} hover>
                        <TableCell>
                          <Link
                            key={emailId}
                            href={siteMap.email.edit(emailId)}
                          >
                            {sender?.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            key={emailId}
                            href={siteMap.messages.email(emailId)}
                          >
                            {subject}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            key={emailId}
                            href={siteMap.messages.email(emailId)}
                          >
                            {new Date(sentOn).toLocaleString()}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            key={emailId}
                            href={siteMap.messages.email(emailId)}
                          >
                            TODO
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            key={emailId}
                            href={siteMap.messages.email(emailId)}
                          >
                            TODO
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
      </Grid>
    </>
  );
};

export default EmailListServer;

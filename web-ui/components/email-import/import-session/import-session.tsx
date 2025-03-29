'use client';

import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import ImportRecord from './import-record';
import {
  InputLabel,
  InputAdornment,
  TextField,
  Button,
  Box,
  TableContainer,
  Paper,
  Table,
  TableBody,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import Mail from '@mui/icons-material/Mail';
import { LoggedError } from '@/lib/react-util';
import { searchEmails } from '@/lib/api/email/import/google';
import { log } from '@/lib/logger';
import { EnhancedTableHead, HeadCell } from '@/components/general';
import { ImportRecordNotifyProps } from './types';
import { MessageImportStatus } from '@/data-models/api/import/email-message';
type ActionButonTaskType = 'load' | 'import' | 'cancel';

const headCells: HeadCell[] = [
  { id: 'sender', numeric: false, disablePadding: true, label: 'Sender' },
  {
    id: 'recipients',
    numeric: false,
    disablePadding: false,
    label: 'Recipients',
    maxWidth: '180px',
  },
  {
    id: 'receivedDate',
    numeric: false,
    disablePadding: false,
    label: 'Received Date',
  },
  { id: 'subject', numeric: false, disablePadding: false, label: 'Subject' },
  {
    id: 'importStatus',
    numeric: false,
    disablePadding: false,
    label: 'Import Status',
  },
];

type KnownEmail = {
  providerId: string;
  queued: boolean;
  hasDownloadSlot?: boolean;
  imported: boolean;
};

const assignDownloadSlots = ({
  emails,
  concurrentSessions,
}: {
  emails: KnownEmail[];
  concurrentSessions: number;
}) => {
  let { pending: pendingDownload, active: activeDownload } = emails.reduce(
    (acc, { queued, imported, hasDownloadSlot: hasDownloadToken }) => {
      if (queued) {
        acc.selected += 1;
        if (!imported) {
          acc.pending += 1;
        }
      }
      if (hasDownloadToken) {
        acc.active += 1;
      }
      return acc;
    },
    { selected: 0, pending: 0, active: 0 },
  );
  let changedBit = false;
  if (!pendingDownload) {
    return changedBit;
  }
  if (activeDownload >= concurrentSessions) {
    log((l) =>
      l.debug({
        message:
          'Maximum concurrent sessions reached. Import will begin when a slot is available.',
      }),
    );
    return changedBit;
  }

  emails.forEach((email) => {
    const { queued, imported, hasDownloadSlot } = email;
    if (
      pendingDownload &&
      !hasDownloadSlot &&
      queued &&
      !imported &&
      activeDownload < concurrentSessions
    ) {
      activeDownload += 1;
      pendingDownload -= 1;
      email.hasDownloadSlot = true;
      changedBit = true;
    }
  });
  return changedBit;
};

const ImportSession: React.FC<{ concurrentSessions?: number }> = ({
  concurrentSessions = 3,
}) => {
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<
    string | undefined
  >();
  const [knownEmails, setKnownEmails] = useState<KnownEmail[]>([]);
  const {
    actionButtonTask,
    importActionButtonText,
    disabled,
    numSelected,
    isImporting,
    rowCount,
  } = useMemo(() => {
    const { numSelected, isImporting } = knownEmails.reduce(
      (acc, { queued, hasDownloadSlot }) => {
        if (queued) {
          acc.numSelected += 1;
          if (hasDownloadSlot) {
            acc.isImporting = true;
          }
        }
        return acc;
      },
      { numSelected: 0, isImporting: false },
    );

    const importing = isImporting
      ? 'cancel'
      : query
        ? query === lastQuery
          ? 'import'
          : 'load'
        : 'load';
    log((l) =>
      l.info({
        message: 'Action button task',
        actionButtonTask: importing,
        query,
        lastQuery,
      }),
    );

    let isDisabled = false;
    switch (importing) {
      case 'cancel':
        isDisabled = false;
        break;
      case 'load':
        isDisabled = !query || query === lastQuery;
        break;
      case 'import':
        isDisabled = false;
        break;
      default:
        isDisabled = true;
        break;
    }
    return {
      actionButtonTask: importing,
      importActionButtonText:
        importing.charAt(0).toUpperCase() + importing.slice(1),
      disabled: isDisabled,
      numSelected,
      isImporting,
      rowCount: knownEmails.length,
    } as {
      actionButtonTask: ActionButonTaskType;
      importActionButtonText: string;
      disabled: boolean;
      numSelected: number;
      isImporting: boolean;
      rowCount: number;
    };
  }, [query, lastQuery, knownEmails]);

  const actionErrorHandler = useCallback(
    (error: unknown) => {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'ImportSession',
      });
      setLastErrorMessage(le.message);
    },
    [setLastErrorMessage],
  );
  const importActionClick = useCallback(() => {
    const loadEmails = async () => {
      const request = searchEmails({ from: query });
      const { results } = await request.awaitable;
      setKnownEmails((initialEmails: KnownEmail[]) => {
        let changedBit = false;
        const allItems = results.reduce(
          (acc: KnownEmail[], item: { id: string }) => {
            if (acc.findIndex((x) => x.providerId === item.id) === -1) {
              acc.push({ providerId: item.id, queued: false, imported: false });
              changedBit = true;
            }
            return acc;
          },
          initialEmails,
        );
        return changedBit ? [...allItems] : initialEmails;
      });
    };
    switch (actionButtonTask) {
      case 'cancel':
        // TODO: cancel import
        break;
      case 'load':
        setIsLoading(true);
        loadEmails()
          .then(() => {
            setLastQuery(query);
          }, actionErrorHandler)
          .finally(() => {
            setIsLoading(false);
          });
        break;
      case 'import':
        // TODOO: Start import
        break;
      default:
        break;
    }
  }, [
    query,
    setLastQuery,
    actionButtonTask,
    actionErrorHandler,
    setIsLoading,
    setKnownEmails,
  ]);
  const updateValueCallback = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      log((l) =>
        l.info({
          message: 'Updating input field',
          field: evt.target?.id,
          query,
        }),
      );
      switch (evt.target?.id) {
        case 'import-from-email':
          console.log('updating query');
          setQuery(evt.target.value);
          break;
        default:
          log((l) =>
            l.warn({
              message: 'Unknown input field',
              field: evt.target?.id,
            }),
          );
      }
    },
    [query],
  );
  const recordNotifyCallback = useCallback(
    ({ providerId, ...props }: ImportRecordNotifyProps) => {
      let changedBit = false;
      const onCheckChanged = () => {
        if (props.action !== 'check-changed') {
          throw new Error('Invalid action');
        }
        setKnownEmails((emails) => {
          const idx = emails.findIndex((x) => x.providerId === providerId);
          if (idx !== -1) {
            emails[idx].queued = props.checked;
            changedBit = true;
          }
          if (changedBit) {
            assignDownloadSlots({ emails, concurrentSessions });
            return [...emails];
          }
          return emails;
        });
      };
      const onReferencesLoaded = () => {
        setKnownEmails((allItems) => {
          if (props.action !== 'references-loaded') {
            throw new Error('Invalid action');
          }
          const { downloaded, references } = props;
          const thisItem = allItems.find((x) => x.providerId === providerId);
          if (thisItem && thisItem.imported !== downloaded) {
            thisItem.imported = downloaded;
            changedBit = true;
          }
          const processed = references.reduce(
            (
              acc: KnownEmail[],
              { providerId, status }: MessageImportStatus,
            ) => {
              if (acc.findIndex((x) => x.providerId === providerId) === -1) {
                log((l) =>
                  l.info({ message: 'Adding known email', providerId }),
                );
                changedBit = true;
                acc.push({
                  providerId,
                  queued: status === 'imported' || status === 'in-progress',
                  imported: status === 'imported',
                });
              }
              return acc;
            },
            allItems,
          );
          if (assignDownloadSlots({ emails: processed, concurrentSessions })) {
            changedBit = true;
          }
          return changedBit ? [...processed] : processed;
        });
      };
      const onImportError = () => {
        if (props.action !== 'import-error') {
          if (props.action !== 'download-complete' || props.successful) {
            throw new Error('Invalid action');
          }
        }
        actionErrorHandler(props.error);
        recordNotifyCallback({
          providerId,
          action: 'check-changed',
          checked: false,
        });
      };
      const onDownloadComplete = () => {
        if (props.action !== 'download-complete') {
          throw new Error('Invalid action');
        }
        setKnownEmails((emails) => {
          const idx = emails.findIndex((x) => x.providerId === providerId);
          if (idx !== -1) {
            emails[idx].hasDownloadSlot = false;
            if (props.successful) {
              emails[idx].imported = true;
            } else {
              emails[idx].imported = false;
              emails[idx].queued = false;
            }
            changedBit = true;
          }
          if (changedBit) {
            assignDownloadSlots({ emails, concurrentSessions });
            return [...emails];
          }
          return emails;
        });
        if (!props.successful) {
          actionErrorHandler(props.error);
        }
      };

      switch (props.action) {
        case 'check-changed':
          onCheckChanged();
          break;
        case 'references-loaded':
          onReferencesLoaded();
          break;
        case 'download-complete':
          onDownloadComplete();
          break;
        case 'import-error':
          onImportError();
          break;
        default:
          const actionProps = { ...(props as object), providerId };
          log((l) =>
            l.warn({ message: 'Unknown action', action: actionProps }),
          );
          break;
      }
    },
    [setKnownEmails, concurrentSessions, actionErrorHandler],
  );
  const onSelectAllClick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const checked =
        event.target instanceof HTMLInputElement ? event.target.checked : false;
      let changedBit = false;
      setKnownEmails((emails) => {
        const ret = emails.map((email) => {
          if (email.queued !== checked) {
            changedBit = true;
            email.queued = checked;
          }
          return email;
        });
        if (changedBit) {
          assignDownloadSlots({ emails: ret, concurrentSessions });
          return ret;
        }
        return emails;
      });
    },
    [concurrentSessions],
  );

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <InputLabel htmlFor="import-from-email">Import from</InputLabel>
      </Grid>
      <Grid size={5}>
        <TextField
          id="import-from-email"
          placeholder="Email address"
          fullWidth
          value={query}
          onChange={updateValueCallback}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Mail />
                </InputAdornment>
              ),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          }}
        />
      </Grid>
      <Grid size={4}>
        <Button
          variant="contained"
          size="large"
          disabled={disabled}
          onClick={importActionClick}
          loading={isImporting}
        >
          {importActionButtonText}
        </Button>
      </Grid>
      {lastErrorMessage ||
        (isLoading && (
          <Grid size={12}>
            {lastErrorMessage && !isLoading && (
              <Box sx={{ color: 'error' }}>{lastErrorMessage}</Box>
            )}
            {isLoading && (
              <Box sx={{ color: 'info', textAlign: 'center' }}>
                <CircularProgress />
                Loading...
              </Box>
            )}
          </Grid>
        ))}
      {(knownEmails?.length ?? 0) > 0 && (
        <Box sx={{ width: '100%' }}>
          <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 430 }}>
              <Table
                stickyHeader
                sx={{ width: '100%', px: 2 }}
                aria-labelledby="tableTitle"
                size={'medium'}
              >
                <EnhancedTableHead
                  headCells={headCells}
                  numSelected={numSelected}
                  rowCount={rowCount}
                  onSelectAllClick={onSelectAllClick}
                />
                <TableBody>
                  {knownEmails.map(
                    ({ providerId, queued, hasDownloadSlot }) => (
                      <ImportRecord
                        key={providerId}
                        isChecked={queued}
                        importStatus={{ providerId }}
                        notify={recordNotifyCallback}
                        canImport={!!hasDownloadSlot}
                      />
                    ),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Grid>
  );
};

export default ImportSession;

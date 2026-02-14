'use client';
import { isMessageImportWithChildrenStatus } from '@/data-models/api/guards';
import { useState, useMemo, useEffect, useRef, useCallback, } from 'react';
import { queryImportStatus, importEmailRecord, } from '@/lib/api/email/import/google';
import { isAbortablePromise } from '@compliance-theater/typescript';
import { LoggedError, log, isError } from '@compliance-theater/logger';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
const ImportRecord = ({ importStatus: importStatusFromProps, isChecked, canImport, notify: notifyParent, }) => {
    const { providerId } = importStatusFromProps;
    const [importStatus, setImportStatus] = useState(importStatusFromProps);
    const [loadRequest, setLoadRequest] = useState();
    const [importRequest, setImportRequest] = useState();
    const [errorMessage, setErrorMessage] = useState();
    const itemRef = useRef(null);
    const theme = useTheme();
    const { sessionLabel, jobState } = useMemo(() => {
        const ret = {};
        const { status = 'pending' } = importStatus;
        if (errorMessage) {
            ret.sessionLabel = errorMessage;
            ret.jobState = 'error';
            return ret;
        }
        switch (status) {
            case 'pending':
                if (isMessageImportWithChildrenStatus(importStatus)) {
                    if (isChecked) {
                        if (importRequest) {
                            ret.jobState = 'waiting-for-import';
                            ret.sessionLabel = 'Importing...';
                        }
                        else {
                            ret.jobState = 'waiting-for-slot';
                            ret.sessionLabel = 'Standing in queue';
                        }
                    }
                    else {
                        ret.jobState = 'ready-for-import';
                        ret.sessionLabel = 'Ready to import';
                    }
                }
                else {
                    ret.jobState = 'loading-message';
                    ret.sessionLabel = '';
                }
                break;
            case 'in-progress':
                ret.jobState = 'waiting-for-import';
                ret.sessionLabel = 'Importing...';
                break;
            case 'imported':
                ret.jobState = 'done';
                ret.sessionLabel = 'Imported';
                break;
            case 'not-found':
                ret.jobState = 'done';
                ret.sessionLabel = 'Not found';
                break;
            case 'error':
                ret.jobState = 'pending';
                ret.sessionLabel = 'Retry after error';
                break;
            default:
                ret.jobState = 'done';
                ret.sessionLabel = 'Imported';
                break;
        }
        return ret;
    }, [importStatus, errorMessage, isChecked, importRequest]);
    useEffect(() => {
        const onRequestError = (error) => {
            const errorSource = 'google-email-import-status';
            if (itemRef.current) {
                const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: errorSource,
                    provider: providerId,
                });
                setErrorMessage(le.message);
                notifyParent({ providerId, action: 'import-error', error: le });
            }
            else {
                log((l) => l.warn({
                    message: 'ImportRecord unmounted before error handling could complete; waiting for remount to process',
                    source: errorSource,
                    error,
                }));
            }
        };
        const loadMessage = () => {
            const actualRequest = loadRequest
                ? loadRequest
                : queryImportStatus(providerId);
            if (isAbortablePromise(actualRequest)) {
                setLoadRequest(actualRequest.awaitable);
            }
            actualRequest
                .then((data) => {
                const newStatus = {
                    ...importStatus,
                    ...data,
                };
                if (itemRef.current) {
                    setImportStatus(newStatus);
                    if (data.references?.length || data.status === 'imported') {
                        notifyParent({
                            providerId,
                            action: 'references-loaded',
                            references: data.references,
                            downloaded: data.status === 'imported',
                        });
                    }
                    setLoadRequest(undefined);
                }
                return newStatus;
            })
                .catch(onRequestError)
                .finally(() => {
                setLoadRequest(undefined);
            });
        };
        const processImport = (req) => {
            const workingRequest = req ?? importRequest;
            if (!workingRequest) {
                if (itemRef.current) {
                    log((l) => l.warn({
                        message: 'No import request available for processing',
                        providerId,
                    }));
                }
                return;
            }
            workingRequest
                .then((response) => {
                if (itemRef.current) {
                    if (response.success) {
                        const { data } = response;
                        setImportStatus((prev) => ({
                            ...prev,
                            emailId: data.targetId ?? prev.emailId,
                            status: data.stage === 'completed' ? 'imported' : 'in-progress',
                        }));
                        notifyParent({
                            providerId,
                            action: 'download-complete',
                            successful: true,
                        });
                    }
                    else {
                        if (isError(response.error)) {
                            throw response.error;
                        }
                        throw new Error(response.message ?? 'Unknown error downloading message.');
                    }
                }
            })
                .catch((e) => {
                if (itemRef.current) {
                    onRequestError(e);
                    notifyParent({
                        providerId,
                        action: 'download-complete',
                        successful: false,
                        error: LoggedError.isTurtlesAllTheWayDownBaby(e),
                    });
                }
            })
                .finally(() => {
                if (itemRef.current) {
                    setImportRequest(undefined);
                }
            });
        };
        const importMessage = () => {
            if (!itemRef.current) {
                return;
            }
            let request;
            const actualRequest = importRequest
                ? importRequest
                : importEmailRecord(providerId);
            if (isAbortablePromise(actualRequest)) {
                request = actualRequest.awaitable;
                setImportRequest(request);
            }
            else {
                request = actualRequest;
            }
            processImport(request);
        };
        switch (jobState) {
            case 'loading-message':
                loadMessage();
                break;
            case 'waiting-for-slot':
                if (canImport) {
                    importMessage();
                }
                break;
            case 'waiting-for-import':
                processImport();
                break;
            case 'ready-for-import':
            case 'done':
                break;
            case 'error':
                break;
            default:
                log((l) => l.warn('Unhandled job state', jobState, providerId));
                break;
        }
    }, [
        jobState,
        importStatus,
        loadRequest,
        providerId,
        notifyParent,
        canImport,
        importRequest,
    ]);
    const onCheckChanged = useCallback((evt, checked) => notifyParent({ providerId, action: 'check-changed', checked }), [notifyParent, providerId]);
    const loadedImportStatus = importStatus;
    const backgroundColor = jobState === 'error'
        ? theme.palette.error.light
        : jobState === 'done'
            ? theme.palette.success.light
            : undefined;
    const inLoadingView = jobState === 'loading-message' || jobState === 'waiting-for-import';
    return (<TableRow sx={{ backgroundColor }}>
      <TableCell padding="checkbox">
        {jobState !== 'loading-message' && jobState !== 'done' && (<Checkbox color="primary" checked={isChecked} onChange={onCheckChanged} inputProps={{
                'aria-labelledby': `enhanced-table-checkbox-${providerId}`,
            }}/>)}
      </TableCell>
      <TableCell>
        {jobState === 'waiting-for-import'
            ? ''
            : loadedImportStatus.sender?.name ??
                loadedImportStatus.sender?.email ??
                ''}
      </TableCell>
      <TableCell sx={{ maxWidth: '180px' }}>
        {jobState === 'waiting-for-import'
            ? ''
            : loadedImportStatus.recipients
                ?.map((x) => x.name ?? x.email)
                ?.join(', ') ?? ''}
      </TableCell>
      <TableCell colSpan={inLoadingView ? 2 : undefined} sx={{ pl: inLoadingView ? 6 : undefined }}>
        {inLoadingView && (<>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 4, pl: 6, pb: 3 }} typography={'span'}>
              {jobState === 'loading-message' ? 'Loading...' : 'Importing...'}
            </Typography>
          </>)}
        {jobState === 'waiting-for-import'
            ? ''
            : loadedImportStatus.receivedDate &&
                (typeof loadedImportStatus.receivedDate === 'string'
                    ? new Date(loadedImportStatus.receivedDate).toLocaleDateString()
                    : loadedImportStatus.receivedDate.toDateString())}
      </TableCell>
      {!inLoadingView && (<TableCell>{loadedImportStatus.subject || ''}</TableCell>)}
      <TableCell>
        <span ref={itemRef}>{sessionLabel}</span>
      </TableCell>
    </TableRow>);
};
export default ImportRecord;
//# sourceMappingURL=import-record.jsx.map
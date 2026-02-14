'use client';
import { useState, useEffect, useMemo } from 'react';
import { log, LoggedError } from '@compliance-theater/logger';
import { errorReporter } from './error-reporter';
import { ErrorSeverity } from './types';
export const useProcessedError = ({ error, resetAction, errorBoundary = 'RootError', }) => {
    const [processedError, setProcessedError] = useState(null);
    useEffect(() => {
        if (!error) {
            if (processedError) {
                setProcessedError(null);
            }
            return;
        }
        if (processedError &&
            processedError.report.fingerprint ===
                errorReporter((r) => r.generateFingerprint(error, processedError.report.context))) {
            resetAction();
            return;
        }
        let cancelled = false;
        errorReporter((r) => r
            .reportBoundaryError(error, {
            errorBoundary,
        }, ErrorSeverity.HIGH)
            .then((result) => {
            if (cancelled) {
                log((l) => l.warn('Error reporting cancelled', { error }));
                return result;
            }
            if (processedError &&
                result.report.fingerprint === processedError.report.fingerprint) {
                resetAction();
                return result;
            }
            setProcessedError((current) => {
                if (!current ||
                    result.report.fingerprint !== current.report.fingerprint) {
                    return result;
                }
                return current;
            });
            if (result.suppress) {
                resetAction();
            }
            return result;
        })
            .catch(async (reportError) => {
            const simulated = {
                suppress: false,
                rule: LoggedError.buildMessage(reportError),
                report: await errorReporter((r) => r.createErrorReport(reportError)),
                logged: false,
                console: false,
                stored: false,
                reported: false,
            };
            log((l) => l.error('Error reporting failed', simulated));
            if (cancelled) {
                return simulated;
            }
            setProcessedError((current) => {
                if (!current ||
                    simulated.report.fingerprint !== current.report.fingerprint) {
                    return simulated;
                }
                return current;
            });
            return simulated;
        }));
        return () => {
            cancelled = true;
        };
    }, [error, processedError, resetAction, errorBoundary]);
    return useMemo(() => {
        const renderError = processedError
            ? processedError.suppress
                ? undefined
                : processedError.report.error
            : undefined;
        return {
            processedError: renderError,
        };
    }, [processedError]);
};
//# sourceMappingURL=use-processed-error.js.map
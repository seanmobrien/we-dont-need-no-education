'use client';
import { useState, useEffect, useMemo } from 'react';
import { log, LoggedError } from '@compliance-theater/logger';
import { errorReporter } from './error-reporter';
import { ErrorReportResult, ErrorSeverity } from './types';

export const useProcessedError = ({
  error,
  resetAction,
  errorBoundary = 'RootError',
}: {
  error: Error | null;
  resetAction : () => void;
  errorBoundary?: string;
}) => {
  const [processedError, setProcessedError] =
    useState<ErrorReportResult | null>(null);

  useEffect(() => {   
    // If there's no error, clear any processed error state and exit
    if (!error) {
      if (processedError) {
        setProcessedError(null);
      }
      return;
    }
    // de-dupe reporting of the same error
    if (
      processedError &&
      processedError.report.fingerprint ===
        errorReporter((r) =>
          r.generateFingerprint(error, processedError.report.context)
        )
    ) {
      resetAction();
      return;
    }
    // If we get here, we have an error and it's different from the last processed one...send a report
    let cancelled = false;
    // Report the error with high severity since it reached the root level
    errorReporter((r) =>
      r
        .reportBoundaryError(
          error,
          {
            errorBoundary,
          },
          ErrorSeverity.HIGH
        )
        .then((result) => {
          // If the component was unmounted, do nothing
          if (cancelled) {
            log((l) => l.warn('Error reporting cancelled', { error }));
            return result;
          }
          // Nothing to do if the error was already processed
          if (
            processedError &&
            result.report.fingerprint === processedError.report.fingerprint
          ) {
            resetAction();
            return result;
          }
          // Update state to reflect the processed error
          setProcessedError((current) => {
            if (
              !current ||
              result.report.fingerprint !== current.report.fingerprint
            ) {
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
            report: await errorReporter((r) =>
              r.createErrorReport(reportError)
            ),
            logged: false,
            console: false,
            stored: false,
            reported: false,
          };
          // Log but don't crash on reporting failure
          log((l) => l.error('Error reporting failed', simulated));
          if (cancelled) {
            return simulated;
          }
          setProcessedError((current) => {
            if (
              !current ||
              simulated.report.fingerprint !== current.report.fingerprint
            ) {
              return simulated;
            }
            return current;
          });
          return simulated;
        })
    );
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

import { errorReporter } from '@/lib/error-monitoring/error-reporter';
import type {
  ErrorContext,
  ErrorReporterInterface,
  ErrorReportResult,
} from '@/lib/error-monitoring/types';
import { log } from '@/lib/logger';

/**
 * Provides access to the shared ErrorReporter instance used by LoggedError.
 *
 * Usage: LoggedErrorReported.Instance.reportError({...})
 */
class LoggedErrorReporter {
  static #instance: ErrorReporterInterface | undefined;
  static makeFakeResult = async (
    error: unknown,
  ): Promise<ErrorReportResult> => {
    const report = await errorReporter((r) => r.createErrorReport(error));
    return {
      suppress: true,
      stored: false,
      logged: true,
      report,
      console: false,
      reported: false,
      rule: 'mock',
    };
  };

  static get Instance(): ErrorReporterInterface {
    if (!LoggedErrorReporter.#instance) {
      const mockReport = (error: unknown) => {
        log((l) =>
          l.error({
            message: 'An error occurred',
            error,
            source: 'Edge Error Reporter instance',
          }),
        );
        return LoggedErrorReporter.makeFakeResult(error);
      };

      const instance = {
        reportError: mockReport,
        reportBoundaryError: mockReport,
        reportUnhandledRejection: mockReport,
        setupGlobalHandlers: () => { },
        subscribeToErrorReports: () => { },
        unsubscribeFromErrorReports: () => { },
        getStoredErrors: () => [],
        clearStoredErrors: () => { },
        generateFingerprint: (error: Error, context: ErrorContext) =>
          errorReporter((x) => x.generateFingerprint(error, context)),
        createErrorReport: (error: unknown) =>
          errorReporter((r) => r.createErrorReport(error)),
      };
      // technically this is a no-op, but it's good to be consistent
      instance.subscribeToErrorReports();
      LoggedErrorReporter.#instance = instance;
    }
    if (!LoggedErrorReporter.#instance) {
      throw new TypeError(
        'Failed to initialize LoggedErrorReporter - telemetry error tracking will not work',
      );
    }
    return LoggedErrorReporter.#instance;
  }
}
export const edgeReporter = (): ErrorReporterInterface => {
  return LoggedErrorReporter.Instance;
};

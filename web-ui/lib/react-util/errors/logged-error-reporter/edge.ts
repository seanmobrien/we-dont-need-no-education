import type { ErrorReporterInterface } from '/lib/error-monitoring/types';
import { log } from '/lib/logger';

/**
 * Provides access to the shared ErrorReporter instance used by LoggedError.
 *
 * Usage: LoggedErrorReported.Instance.reportError({...})
 */
class LoggedErrorReporter {
  static #instance: ErrorReporterInterface | undefined;
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
        return Promise.resolve();
      };

      LoggedErrorReporter.#instance = {
        reportError: mockReport,
        reportBoundaryError: mockReport,
        reportUnhandledRejection: mockReport,
        setupGlobalHandlers: () => {},
        getStoredErrors: () => [],
        clearStoredErrors: () => {},
      };
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

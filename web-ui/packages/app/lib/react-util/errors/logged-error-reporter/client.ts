import type { ErrorReporterInterface } from '@/lib/error-monitoring/types';
import { ErrorReporter } from '@/lib/error-monitoring/error-reporter';

/**
 * Provides access to the shared ErrorReporter instance used by LoggedError.
 *
 * Usage: LoggedErrorReported.Instance.reportError({...})
 */
class LoggedErrorReporter {
  static #instance: ErrorReporterInterface | undefined;
  static get Instance(): ErrorReporterInterface {
    if (!LoggedErrorReporter.#instance) {
      const instance = ErrorReporter.createInstance({
        enableStandardLogging: true,
        enableConsoleLogging: true,
        enableExternalReporting: true,
        enableLocalStorage: true,
      });
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
export const clientReporter = (): ErrorReporterInterface => {
  return LoggedErrorReporter.Instance;
};

import type { ErrorReporterInterface } from '../monitoring/types';
import { ErrorReporter } from '../monitoring/error-reporter';

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

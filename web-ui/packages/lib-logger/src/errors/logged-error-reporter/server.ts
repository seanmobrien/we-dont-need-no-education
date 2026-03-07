import type { ErrorReporterInterface } from '../monitoring/types';
import { SingletonProvider } from '../../singleton-provider/index';
import { ErrorReporter } from '../monitoring';

const REPORTER_SINGLETON_KEY =
  '@noeducation/lib/logger/errors/logged-error-reporter/server';

const createReporterInstance = (): ErrorReporterInterface => {
  const reporter = ErrorReporter.createInstance({
    enableStandardLogging: true,
    enableConsoleLogging: false,
    enableExternalReporting: true,
    enableLocalStorage: false,
  });
  if (!reporter) {
    throw new TypeError(
      'Failed to initialize LoggedErrorReporter - telemetry error tracking will not work',
    );
  }
  reporter.subscribeToErrorReports();
  return reporter;
};

export const serverReporter = (): ErrorReporterInterface => {
  return SingletonProvider.Instance.getRequired(
    REPORTER_SINGLETON_KEY,
    createReporterInstance,
  );
};

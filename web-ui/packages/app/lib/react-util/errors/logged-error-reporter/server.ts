import type { ErrorReporterInterface } from '@/lib/error-monitoring/types';
import { ErrorReporter } from '@/lib/error-monitoring/error-reporter';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider/provider';

const REPORTER_SINGLETON_KEY =
  '@noeducation/lib/react-util/errors/logged-error-reporter/server';

const createReporterInstance = (): ErrorReporterInterface => {
  const reporter = ErrorReporter.createInstance({
    enableStandardLogging: true,
    enableConsoleLogging: false,
    enableExternalReporting: true,
    enableLocalStorage: false,
  });
  if (!reporter) {
    throw new TypeError(
      'Failed to initialize LoggedErrorReporter - telemetry error tracking will not work'
    );
  }
  reporter.subscribeToErrorReports();
  return reporter;
};

export const serverReporter = (): ErrorReporterInterface => {
  return SingletonProvider.Instance.getRequired(
    REPORTER_SINGLETON_KEY,
    createReporterInstance
  );
};

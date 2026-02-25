import { ErrorReporterConfig, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
import { ConsoleReportingStrategy } from './console-strategy';
import { StandardLoggingStrategy } from './standard-logging-strategy';
import { LocalStorageStrategy } from './local-storage-strategy';
import { GoogleAnalyticsStrategy } from './google-analytics-strategy';
import { ClientApplicationInsightsStrategy } from './client-application-insights-strategy';
import { ServerApplicationInsightsStrategy } from './server-application-insights-strategy';
import { EdgeApplicationInsightsStrategy } from './edge-application-insights-strategy';

export class StrategyCollectionFactory {
  static createStrategies(
    config: ErrorReporterConfig,
    suppression: Partial<ErrorReportResult> = {},
  ): ReportActionStrategy[] {
    // 2) if suppress=true, completely=true then no strategies execute
    if (suppression.suppress && suppression.completely) {
      return [];
    }

    // 3) if suppress=true, completely=false then console-strategy executes but no other strategies do
    if (suppression.suppress && !suppression.completely) {
      return config.enableConsoleLogging
        ? [new ConsoleReportingStrategy()]
        : [];
    }

    // 1) if suppress=false, no impact, all configured strategies run
    const strategies: ReportActionStrategy[] = [];

    if (config.enableStandardLogging) {
      strategies.push(new StandardLoggingStrategy());
    }

    if (config.enableConsoleLogging) {
      strategies.push(new ConsoleReportingStrategy());
    }

    if (config.enableLocalStorage) {
      strategies.push(new LocalStorageStrategy());
    }

    if (config.enableExternalReporting) {
      strategies.push(new GoogleAnalyticsStrategy());

      // Select appropriate App Insights strategy based on environment
      if (typeof window === 'undefined') {
        if ((process.env.NEXT_RUNTIME ?? '').toLowerCase() === 'edge') {
          strategies.push(new EdgeApplicationInsightsStrategy());
        } else {
          strategies.push(new ServerApplicationInsightsStrategy());
        }
      } else {
        strategies.push(new ClientApplicationInsightsStrategy());
      }
    }

    return strategies;
  }
}

import { ErrorReport, ErrorReporterConfig, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';

export class ConsoleReportingStrategy implements ReportActionStrategy {
  async execute(
    report: ErrorReport,
    config: ErrorReporterConfig
  ): Promise<Partial<ErrorReportResult>> {
    if (config.enableConsoleLogging) {
      console.group(`🐛 Error Report [${report.severity?.toUpperCase()}]`);
      console.error('Error:', report.error);
      console.table(report.context);
      console.groupEnd();
      return { console: true };
    }
    return { console: false };
  }
}

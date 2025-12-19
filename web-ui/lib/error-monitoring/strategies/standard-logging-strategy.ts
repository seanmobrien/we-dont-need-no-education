import { log } from '@/lib/logger';
import { ErrorReport, ErrorReporterConfig, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';

export class StandardLoggingStrategy implements ReportActionStrategy {
  async execute(
    report: ErrorReport,
    config: ErrorReporterConfig
  ): Promise<Partial<ErrorReportResult>> {
    if (config.enableStandardLogging) {
      const source = report.context.source ?? 'ErrorReporter';
      log((l) =>
        l.error({
          source,
          body: JSON.stringify(report.error),
          severity: report.severity,
          fingerprint: report.fingerprint,
          tags: report.tags,
          context: report.context,
          [Symbol.toStringTag]: `${source}: (${report.fingerprint ?? 'no fingerprint'}) ${report.error.message}`,
        }),
      );
      return { logged: true };
    }
    return { logged: false };
  }
}

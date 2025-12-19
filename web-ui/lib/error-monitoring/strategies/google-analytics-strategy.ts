import { ErrorReport, ErrorReportResult, ErrorSeverity } from '../types';
import { ReportActionStrategy } from './report-action-strategy';

const isGtagClient = <T>(
  check: T,
): check is T & {
  gtag: (
    signal: string,
    event: string,
    params: Record<string, unknown>,
  ) => void;
} =>
  typeof check === 'object' &&
  check !== null &&
  'gtag' in check &&
  typeof check.gtag === 'function';

export class GoogleAnalyticsStrategy implements ReportActionStrategy {
  async execute(
    report: ErrorReport,
  ): Promise<Partial<ErrorReportResult>> {
    if (typeof window !== 'undefined' && isGtagClient(window)) {
      window.gtag('event', 'exception', {
        description: report.error.message,
        fatal: report.severity === ErrorSeverity.CRITICAL,
        error_severity: report.severity,
        error_fingerprint: report.fingerprint,
      });
      return { reported: true };
    }
    return {};
  }
}

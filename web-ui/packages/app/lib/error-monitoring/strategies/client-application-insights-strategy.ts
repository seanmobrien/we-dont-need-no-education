import { ErrorReport, ErrorReportResult, ErrorSeverity } from '../types';
import { ReportActionStrategy } from './report-action-strategy';

export class ClientApplicationInsightsStrategy implements ReportActionStrategy {
  async execute(
    report: ErrorReport,
  ): Promise<Partial<ErrorReportResult>> {
    await import('@/instrument/browser').then((m) => {
      const appInsights = m.getAppInsights();
      if (appInsights) {
        appInsights.trackException({
          exception: report.error,
          severityLevel: this.mapSeverityToAppInsights(report.severity),
          properties: {
            ...report.tags,
            ...report.context,
            fingerprint: report.fingerprint,
          },
        });
      }
    });

    return { reported: true };
  }

  private mapSeverityToAppInsights(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 3; // KnownSeverityLevel.Error
      case ErrorSeverity.MEDIUM:
        return 2; // KnownSeverityLevel.Warning
      case ErrorSeverity.LOW:
        return 1; // KnownSeverityLevel.Information
      default:
        return 0; // KnownSeverityLevel.Verbose
    }
  }
}

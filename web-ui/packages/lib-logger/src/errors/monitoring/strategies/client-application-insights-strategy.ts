import { ErrorReport, ErrorReportResult, ErrorSeverity } from '../types';
import { ReportActionStrategy } from './report-action-strategy';

interface AppInsightsLike {
  trackException: (payload: {
    exception: Error;
    severityLevel: number;
    properties: Record<string, unknown>;
  }) => void;
}

export class ClientApplicationInsightsStrategy implements ReportActionStrategy {
  async execute(
    report: ErrorReport,
  ): Promise<Partial<ErrorReportResult>> {
    const appInsights = this.getAppInsights();
    if (!appInsights) {
      return { reported: false };
    }

    appInsights.trackException({
      exception: report.error,
      severityLevel: this.mapSeverityToAppInsights(report.severity),
      properties: {
        ...report.tags,
        ...report.context,
        fingerprint: report.fingerprint,
      },
    });

    return { reported: true };
  }

  private getAppInsights(): AppInsightsLike | undefined {
    const candidate = (
      globalThis as { appInsights?: AppInsightsLike | undefined }
    ).appInsights;

    if (candidate && typeof candidate.trackException === 'function') {
      return candidate;
    }

    return undefined;
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

import { ErrorReport, ErrorReporterConfig, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';

export class LocalStorageStrategy implements ReportActionStrategy {
  async execute(
    report: ErrorReport,
    config: ErrorReporterConfig
  ): Promise<Partial<ErrorReportResult>> {
    if (config.enableLocalStorage && typeof window !== 'undefined') {
      try {
        if (typeof localStorage === 'undefined') {
          return { stored: false };
        }
        const stored = JSON.parse(localStorage.getItem('error-reports') || '[]');
        stored.push({
          ...report,
          error: {
            name: report.error.name,
            message: report.error.message,
            stack: report.error.stack,
          },
        });

        // Keep only the most recent errors
        const trimmed = stored.slice(-(config.maxStoredErrors || 50));
        localStorage.setItem('error-reports', JSON.stringify(trimmed));
        return { stored: true };
      } catch {
        // Storage failed, ignore
        return { stored: false };
      }
    }
    return { stored: false };
  }
}

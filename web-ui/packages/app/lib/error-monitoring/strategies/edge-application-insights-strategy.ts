import { log } from '@repo/lib-logger';
import { ErrorReport, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';

export class EdgeApplicationInsightsStrategy implements ReportActionStrategy {
  async execute(
    report: ErrorReport,
  ): Promise<Partial<ErrorReportResult>> {
    log((l) => l.debug('Would report to Application Insights (Edge):', report));
    return { reported: true };
  }
}

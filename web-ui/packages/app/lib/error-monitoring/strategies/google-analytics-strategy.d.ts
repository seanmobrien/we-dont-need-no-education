import { ErrorReport, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
export declare class GoogleAnalyticsStrategy implements ReportActionStrategy {
    execute(report: ErrorReport): Promise<Partial<ErrorReportResult>>;
}
//# sourceMappingURL=google-analytics-strategy.d.ts.map
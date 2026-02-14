import { ErrorReport, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
export declare class EdgeApplicationInsightsStrategy implements ReportActionStrategy {
    execute(report: ErrorReport): Promise<Partial<ErrorReportResult>>;
}
//# sourceMappingURL=edge-application-insights-strategy.d.ts.map
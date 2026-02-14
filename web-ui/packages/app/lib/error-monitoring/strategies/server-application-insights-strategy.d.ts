import { ErrorReport, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
export declare class ServerApplicationInsightsStrategy implements ReportActionStrategy {
    execute(report: ErrorReport): Promise<Partial<ErrorReportResult>>;
}
//# sourceMappingURL=server-application-insights-strategy.d.ts.map
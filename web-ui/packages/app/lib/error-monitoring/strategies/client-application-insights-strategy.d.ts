import { ErrorReport, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
export declare class ClientApplicationInsightsStrategy implements ReportActionStrategy {
    execute(report: ErrorReport): Promise<Partial<ErrorReportResult>>;
    private mapSeverityToAppInsights;
}
//# sourceMappingURL=client-application-insights-strategy.d.ts.map
import { ErrorReport, ErrorReporterConfig, ErrorReportResult } from '../types';
export interface ReportActionStrategy {
    execute(report: ErrorReport, config: ErrorReporterConfig): Promise<Partial<ErrorReportResult>>;
}
//# sourceMappingURL=report-action-strategy.d.ts.map
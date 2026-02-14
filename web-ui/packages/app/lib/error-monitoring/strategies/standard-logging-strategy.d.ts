import { ErrorReport, ErrorReporterConfig, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
export declare class StandardLoggingStrategy implements ReportActionStrategy {
    execute(report: ErrorReport, config: ErrorReporterConfig): Promise<Partial<ErrorReportResult>>;
}
//# sourceMappingURL=standard-logging-strategy.d.ts.map
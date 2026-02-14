import { ErrorReport, ErrorReporterConfig, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
export declare class ConsoleReportingStrategy implements ReportActionStrategy {
    execute(report: ErrorReport, config: ErrorReporterConfig): Promise<Partial<ErrorReportResult>>;
}
//# sourceMappingURL=console-strategy.d.ts.map
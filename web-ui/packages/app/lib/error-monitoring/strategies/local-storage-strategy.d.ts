import { ErrorReport, ErrorReporterConfig, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
export declare class LocalStorageStrategy implements ReportActionStrategy {
    execute(report: ErrorReport, config: ErrorReporterConfig): Promise<Partial<ErrorReportResult>>;
}
//# sourceMappingURL=local-storage-strategy.d.ts.map
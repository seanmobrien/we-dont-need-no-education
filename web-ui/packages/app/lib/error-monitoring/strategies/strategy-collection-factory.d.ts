import { ErrorReporterConfig, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';
export declare class StrategyCollectionFactory {
    static createStrategies(config: ErrorReporterConfig, suppression?: Partial<ErrorReportResult>): ReportActionStrategy[];
}
//# sourceMappingURL=strategy-collection-factory.d.ts.map
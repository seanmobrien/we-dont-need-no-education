import { ErrorReport, ErrorReporterConfig, ErrorReportResult } from '../types';

export interface ReportActionStrategy {
  /**
   * Execute the reporting action
   * @param report The error report to process
   * @param config The current configuration of the error reporter
   * @returns Partial ErrorReportResult to merge into the final result
   */
  execute(
    report: ErrorReport,
    config: ErrorReporterConfig
  ): Promise<Partial<ErrorReportResult>>;
}

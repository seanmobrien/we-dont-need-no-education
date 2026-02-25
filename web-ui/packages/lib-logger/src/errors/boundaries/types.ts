import type {
    ErrorSuppressionRule as MonitoringErrorSuppressionRule,
    SuppressionResult as MonitoringSuppressionResult,
} from '../monitoring/types';

export type ErrorSuppressionRule = MonitoringErrorSuppressionRule;
export type SuppressionResult = MonitoringSuppressionResult;

export interface ClientErrorManagerConfig {
    suppressionRules?: ErrorSuppressionRule[];
    surfaceToErrorBoundary?: boolean;
    reportSuppressedErrors?: boolean;
    debounceMs?: number;
}

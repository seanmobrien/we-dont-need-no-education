import { ErrorSeverity } from '../types';
const isGtagClient = (check) => typeof check === 'object' &&
    check !== null &&
    'gtag' in check &&
    typeof check.gtag === 'function';
export class GoogleAnalyticsStrategy {
    async execute(report) {
        if (typeof window !== 'undefined' && isGtagClient(window)) {
            window.gtag('event', 'exception', {
                description: report.error.message,
                fatal: report.severity === ErrorSeverity.CRITICAL,
                error_severity: report.severity,
                error_fingerprint: report.fingerprint,
            });
            return { reported: true };
        }
        return {};
    }
}
//# sourceMappingURL=google-analytics-strategy.js.map
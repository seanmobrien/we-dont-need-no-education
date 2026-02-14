import { ErrorSeverity } from '../types';
export class ClientApplicationInsightsStrategy {
    async execute(report) {
        await import('@/instrument/browser').then((m) => {
            const appInsights = m.getAppInsights();
            if (appInsights) {
                appInsights.trackException({
                    exception: report.error,
                    severityLevel: this.mapSeverityToAppInsights(report.severity),
                    properties: {
                        ...report.tags,
                        ...report.context,
                        fingerprint: report.fingerprint,
                    },
                });
            }
        });
        return { reported: true };
    }
    mapSeverityToAppInsights(severity) {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                return 3;
            case ErrorSeverity.MEDIUM:
                return 2;
            case ErrorSeverity.LOW:
                return 1;
            default:
                return 0;
        }
    }
}
//# sourceMappingURL=client-application-insights-strategy.js.map
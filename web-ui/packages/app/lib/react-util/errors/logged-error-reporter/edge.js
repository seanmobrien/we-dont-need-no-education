import { errorReporter } from '@/lib/error-monitoring/error-reporter';
import { log } from '@compliance-theater/logger';
class LoggedErrorReporter {
    static #instance;
    static makeFakeResult = async (error) => {
        const report = await errorReporter((r) => r.createErrorReport(error));
        return {
            suppress: true,
            stored: false,
            logged: true,
            report,
            console: false,
            reported: false,
            rule: 'mock',
        };
    };
    static get Instance() {
        if (!LoggedErrorReporter.#instance) {
            const mockReport = (error) => {
                log((l) => l.error({
                    message: 'An error occurred',
                    error,
                    source: 'Edge Error Reporter instance',
                }));
                return LoggedErrorReporter.makeFakeResult(error);
            };
            const instance = {
                reportError: mockReport,
                reportBoundaryError: mockReport,
                reportUnhandledRejection: mockReport,
                setupGlobalHandlers: () => { },
                subscribeToErrorReports: () => { },
                unsubscribeFromErrorReports: () => { },
                getStoredErrors: () => [],
                clearStoredErrors: () => { },
                generateFingerprint: (error, context) => errorReporter((x) => x.generateFingerprint(error, context)),
                createErrorReport: (error) => errorReporter((r) => r.createErrorReport(error)),
            };
            instance.subscribeToErrorReports();
            LoggedErrorReporter.#instance = instance;
        }
        if (!LoggedErrorReporter.#instance) {
            throw new TypeError('Failed to initialize LoggedErrorReporter - telemetry error tracking will not work');
        }
        return LoggedErrorReporter.#instance;
    }
}
export const edgeReporter = () => {
    return LoggedErrorReporter.Instance;
};
//# sourceMappingURL=edge.js.map
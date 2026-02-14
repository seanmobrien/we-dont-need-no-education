import { ErrorReporter } from '@/lib/error-monitoring/error-reporter';
class LoggedErrorReporter {
    static #instance;
    static get Instance() {
        if (!LoggedErrorReporter.#instance) {
            const instance = ErrorReporter.createInstance({
                enableStandardLogging: true,
                enableConsoleLogging: true,
                enableExternalReporting: true,
                enableLocalStorage: true,
            });
            instance.subscribeToErrorReports();
            LoggedErrorReporter.#instance = instance;
        }
        if (!LoggedErrorReporter.#instance) {
            throw new TypeError('Failed to initialize LoggedErrorReporter - telemetry error tracking will not work');
        }
        return LoggedErrorReporter.#instance;
    }
}
export const clientReporter = () => {
    return LoggedErrorReporter.Instance;
};
//# sourceMappingURL=client.js.map
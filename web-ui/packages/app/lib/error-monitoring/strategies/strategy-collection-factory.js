import { ConsoleReportingStrategy } from './console-strategy';
import { StandardLoggingStrategy } from './standard-logging-strategy';
import { LocalStorageStrategy } from './local-storage-strategy';
import { GoogleAnalyticsStrategy } from './google-analytics-strategy';
import { ClientApplicationInsightsStrategy } from './client-application-insights-strategy';
import { ServerApplicationInsightsStrategy } from './server-application-insights-strategy';
import { EdgeApplicationInsightsStrategy } from './edge-application-insights-strategy';
export class StrategyCollectionFactory {
    static createStrategies(config, suppression = {}) {
        if (suppression.suppress && suppression.completely) {
            return [];
        }
        if (suppression.suppress && !suppression.completely) {
            return config.enableConsoleLogging
                ? [new ConsoleReportingStrategy()]
                : [];
        }
        const strategies = [];
        if (config.enableStandardLogging) {
            strategies.push(new StandardLoggingStrategy());
        }
        if (config.enableConsoleLogging) {
            strategies.push(new ConsoleReportingStrategy());
        }
        if (config.enableLocalStorage) {
            strategies.push(new LocalStorageStrategy());
        }
        if (config.enableExternalReporting) {
            strategies.push(new GoogleAnalyticsStrategy());
            if (typeof window === 'undefined') {
                if ((process.env.NEXT_RUNTIME ?? '').toLowerCase() === 'edge') {
                    strategies.push(new EdgeApplicationInsightsStrategy());
                }
                else {
                    strategies.push(new ServerApplicationInsightsStrategy());
                }
            }
            else {
                strategies.push(new ClientApplicationInsightsStrategy());
            }
        }
        return strategies;
    }
}
//# sourceMappingURL=strategy-collection-factory.js.map
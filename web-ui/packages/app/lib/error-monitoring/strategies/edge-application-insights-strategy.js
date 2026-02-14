import { log } from '@compliance-theater/logger';
export class EdgeApplicationInsightsStrategy {
    async execute(report) {
        log((l) => l.debug('Would report to Application Insights (Edge):', report));
        return { reported: true };
    }
}
//# sourceMappingURL=edge-application-insights-strategy.js.map
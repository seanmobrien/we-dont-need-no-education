import { log } from '@compliance-theater/logger';
export class StandardLoggingStrategy {
    async execute(report, config) {
        if (config.enableStandardLogging) {
            const source = report.context.source ?? 'ErrorReporter';
            log((l) => l.error({
                source,
                body: JSON.stringify(report.error),
                severity: report.severity,
                fingerprint: report.fingerprint,
                tags: report.tags,
                context: report.context,
                [Symbol.toStringTag]: `${source}: (${report.fingerprint ?? 'no fingerprint'}) ${report.error.message}`,
            }));
            return { logged: true };
        }
        return { logged: false };
    }
}
//# sourceMappingURL=standard-logging-strategy.js.map
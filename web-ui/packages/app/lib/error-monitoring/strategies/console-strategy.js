export class ConsoleReportingStrategy {
    async execute(report, config) {
        if (config.enableConsoleLogging) {
            console.group(`🐛 Error Report [${report.severity?.toUpperCase()}]`);
            console.error('Error:', report.error);
            console.table(report.context);
            console.groupEnd();
            return { console: true };
        }
        return { console: false };
    }
}
//# sourceMappingURL=console-strategy.js.map
export class LocalStorageStrategy {
    async execute(report, config) {
        if (config.enableLocalStorage && typeof window !== 'undefined') {
            try {
                if (typeof localStorage === 'undefined') {
                    return { stored: false };
                }
                const stored = JSON.parse(localStorage.getItem('error-reports') || '[]');
                stored.push({
                    ...report,
                    error: {
                        name: report.error.name,
                        message: report.error.message,
                        stack: report.error.stack,
                    },
                });
                const trimmed = stored.slice(-(config.maxStoredErrors || 50));
                localStorage.setItem('error-reports', JSON.stringify(trimmed));
                return { stored: true };
            }
            catch {
                return { stored: false };
            }
        }
        return { stored: false };
    }
}
//# sourceMappingURL=local-storage-strategy.js.map
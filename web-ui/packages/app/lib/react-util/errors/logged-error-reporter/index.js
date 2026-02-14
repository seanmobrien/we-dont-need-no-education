export const reporter = async () => {
    if (typeof window === 'undefined') {
        if (process.env.NEXT_RUNTIME === 'nodejs') {
            const { serverReporter } = await import('./server');
            return serverReporter();
        }
        else {
            const { edgeReporter } = await import('./edge');
            return edgeReporter();
        }
    }
    else {
        const { clientReporter } = await import('./client');
        return clientReporter();
    }
};
export const initializeErrorReporterConfig = async () => {
    const reporterInstance = await reporter();
    if (!reporterInstance) {
        throw new Error('Failed to create error reporter');
    }
};
//# sourceMappingURL=index.js.map
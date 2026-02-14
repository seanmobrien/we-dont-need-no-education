jest.mock('@/lib/error-monitoring/error-reporter', () => {
    const originalModule = jest.requireActual('@/lib/error-monitoring/error-reporter');
    const mockReporterInstance = jest.fn(() => ({
        createErrorReport: jest.fn(),
        generateFingerprint: jest.fn(),
        reportError: jest.fn(),
        reportBoundaryError: jest.fn(),
        reportUnhandledRejection: jest.fn(),
        setupGlobalHandlers: jest.fn(),
        getStoredErrors: jest.fn(),
        clearStoredErrors: jest.fn(),
    }))();
    const mockErrorReporter = jest.fn((cb) => {
        if (cb) {
            return cb(mockReporterInstance);
        }
        return mockReporterInstance;
    });
    return {
        ...originalModule,
        __esModule: true,
        errorReporter: mockErrorReporter,
    };
});
export {};
//# sourceMappingURL=jest.error-monitoring.error-reporter.js.map
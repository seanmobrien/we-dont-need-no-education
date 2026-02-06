jest.mock('@/lib/error-monitoring/error-reporter', () => {
  const originalModule = jest.requireActual(
    '@/lib/error-monitoring/error-reporter',
  );

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

  const mockErrorReporter = jest.fn(
    (cb?: (r: typeof mockReporterInstance) => any) => {
      if (cb) {
        return cb(mockReporterInstance);
      }
      return mockReporterInstance;
    },
  );
  return {
    ...originalModule,
    __esModule: true,
    errorReporter: mockErrorReporter,
  };
});

import { errorReporter } from '../../app/lib/error-monitoring/error-reporter';

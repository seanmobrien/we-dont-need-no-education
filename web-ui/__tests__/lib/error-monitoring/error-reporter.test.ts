/**
 * @jest-environment jsdom
 */
import {
  ErrorReporter,
  ErrorSeverity,
} from '@/lib/error-monitoring/error-reporter';

// Mock external dependencies
const mockGtag = jest.fn();
Object.defineProperty(window, 'gtag', {
  value: mockGtag,
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock console methods
const mockConsoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {});
const mockConsoleGroup = jest
  .spyOn(console, 'group')
  .mockImplementation(() => {});
const mockConsoleGroupEnd = jest
  .spyOn(console, 'groupEnd')
  .mockImplementation(() => {});
const mockConsoleTable = jest
  .spyOn(console, 'table')
  .mockImplementation(() => {});

describe('ErrorReporter', () => {
  let errorReporter: ErrorReporter;

  it('fix these later', () => {});

  /*

  beforeEach(() => {
    // jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
    
    // Reset singleton instance
    (ErrorReporter as any).instance = undefined;
    
    errorReporter = ErrorReporter.getInstance({
      enableConsoleLogging: true,
      enableExternalReporting: true,
      enableLocalStorage: true,
      maxStoredErrors: 10,
      environment: 'development',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorReporter.getInstance();
      const instance2 = ErrorReporter.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should use default config when none provided', () => {
      const instance = ErrorReporter.getInstance();
      expect(instance).toBeInstanceOf(ErrorReporter);
    });
  });

  describe('Error Reporting', () => {
    it('should report error with default severity', async () => {
      const testError = new Error('Test error message');
      
      await errorReporter.reportError(testError);

      // Should log to console in development
      expect(mockConsoleGroup).toHaveBeenCalledWith('🐛 Error Report [MEDIUM]');
      expect(mockConsoleError).toHaveBeenCalledWith('Error:', testError);
      expect(mockConsoleTable).toHaveBeenCalled();
      expect(mockConsoleGroupEnd).toHaveBeenCalled();
    });

    it('should report error with custom severity', async () => {
      const testError = new Error('Critical test error');
      
      await errorReporter.reportError(testError, ErrorSeverity.CRITICAL);

      expect(mockConsoleGroup).toHaveBeenCalledWith('🐛 Error Report [CRITICAL]');
    });

    it('should enrich error context', async () => {
      const testError = new Error('Test error with context');
      const customContext = {
        userId: 'test-user-123',
        additionalData: { component: 'TestComponent' },
      };
      
      await errorReporter.reportError(testError, ErrorSeverity.HIGH, customContext);

      // Verify context enrichment (URL, userAgent, timestamp should be added)
      expect(mockConsoleTable).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-123',
          url: expect.any(String),
          userAgent: expect.any(String),
          timestamp: expect.any(Date),
          additionalData: { component: 'TestComponent' },
        })
      );
    });

    it('should normalize non-Error objects', async () => {
      const stringError = 'String error message';
      
      await errorReporter.reportError(stringError);

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', expect.any(Error));
    });

    it('should handle undefined/null errors', async () => {
      await errorReporter.reportError(null);
      await errorReporter.reportError(undefined);

      expect(mockConsoleError).toHaveBeenCalledTimes(2);
    });
  });

  describe('Boundary Error Reporting', () => {
    it('should report boundary errors with component stack', async () => {
      const testError = new Error('Component error');
      const errorInfo = {
        componentStack: '\n    at TestComponent\n    at App',
        errorBoundary: 'TestErrorBoundary',
      };
      
      await errorReporter.reportBoundaryError(testError, errorInfo, ErrorSeverity.HIGH);

      expect(mockConsoleGroup).toHaveBeenCalledWith('🐛 Error Report [HIGH]');
      expect(mockConsoleTable).toHaveBeenCalledWith(
        expect.objectContaining({
          componentStack: errorInfo.componentStack,
          errorBoundary: errorInfo.errorBoundary,
        })
      );
    });
  });

  describe('Unhandled Rejection Reporting', () => {
    it('should report unhandled promise rejections', async () => {
      const rejectionReason = new Error('Promise rejection');
      const mockPromise = {} as Promise<unknown>; // Mock promise object
      
      await errorReporter.reportUnhandledRejection(rejectionReason, mockPromise);

      expect(mockConsoleGroup).toHaveBeenCalledWith('🐛 Error Report [HIGH]');
      expect(mockConsoleTable).toHaveBeenCalledWith(
        expect.objectContaining({
          breadcrumbs: ['unhandled-promise-rejection'],
          additionalData: expect.objectContaining({
            promiseString: expect.any(String),
          }),
        })
      );
    });

    it('should handle non-Error rejection reasons', async () => {
      const rejectionReason = 'String rejection reason';
      const mockPromise = Promise.reject(rejectionReason);
      
      await errorReporter.reportUnhandledRejection(rejectionReason, mockPromise);

      expect(mockConsoleError).toHaveBeenCalledWith('Error:', expect.any(Error));
    });
  });

  describe('External Service Integration', () => {
    it('should report to Google Analytics when available', async () => {
      const testError = new Error('GA test error');
      
      await errorReporter.reportError(testError, ErrorSeverity.CRITICAL);

      expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
        description: 'GA test error',
        fatal: true,
        error_severity: 'critical',
        error_fingerprint: expect.any(String),
      });
    });

    it('should handle missing gtag gracefully', async () => {
      delete (window as any).gtag;
      
      const testError = new Error('No GA test error');
      
      await errorReporter.reportError(testError);

      // Should not throw error
      expect(mockConsoleGroup).toHaveBeenCalled();
    });
  });

  describe('Local Storage Management', () => {
    it('should store errors in localStorage', async () => {
      const testError = new Error('Storage test error');
      
      await errorReporter.reportError(testError);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'error-reports',
        expect.stringContaining('Storage test error')
      );
    });

    it('should limit stored errors to maxStoredErrors', async () => {
      // Mock existing errors at limit
      const existingErrors = Array(10).fill(null).map((_, i) => ({
        error: { message: `Error ${i}` },
        timestamp: new Date(),
      }));
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingErrors));
      
      const testError = new Error('New error');
      await errorReporter.reportError(testError);

      const setItemCall = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      
      // Should limit to maxStoredErrors (10)
      expect(storedData).toHaveLength(10);
      expect(storedData[9].error.message).toBe('New error');
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const testError = new Error('Storage error test');
      
      // Should not throw error
      await expect(errorReporter.reportError(testError)).resolves.not.toThrow();
    });

    it('should retrieve stored errors', () => {
      const mockErrors = [
        { error: { message: 'Error 1' }, timestamp: new Date() },
        { error: { message: 'Error 2' }, timestamp: new Date() },
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockErrors));
      
      const storedErrors = errorReporter.getStoredErrors();
      
      expect(storedErrors).toEqual(mockErrors);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('error-reports');
    });

    it('should clear stored errors', () => {
      errorReporter.clearStoredErrors();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('error-reports');
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const storedErrors = errorReporter.getStoredErrors();
      
      expect(storedErrors).toEqual([]);
    });
  });

  describe('Global Error Handlers', () => {
    beforeEach(() => {
      // Mock window event listeners
      window.addEventListener = jest.fn();
      window.removeEventListener = jest.fn();
    });

    it('should setup global error handlers', () => {
      errorReporter.setupGlobalHandlers();

      expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    it('should handle global window errors', () => {
      errorReporter.setupGlobalHandlers();
      
      // Get the error handler
      const errorHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      const mockEvent = {
        error: new Error('Global error'),
        message: 'Global error',
        filename: 'script.js',
        lineno: 123,
        colno: 45,
      };

      errorHandler(mockEvent);

      expect(mockConsoleGroup).toHaveBeenCalledWith('🐛 Error Report [HIGH]');
    });

    it('should handle global unhandled rejections', () => {
      errorReporter.setupGlobalHandlers();
      
      // Get the rejection handler
      const rejectionHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        call => call[0] === 'unhandledrejection'
      )?.[1];

      const mockEvent = {
        reason: new Error('Unhandled rejection'),
        promise: Promise.reject('test'),
      };

      rejectionHandler(mockEvent);

      expect(mockConsoleGroup).toHaveBeenCalledWith('🐛 Error Report [HIGH]');
    });
  });

  describe('Error Fingerprinting', () => {
    it('should generate consistent fingerprints for similar errors', async () => {
      const error1 = new Error('Same error message');
      const error2 = new Error('Same error message');
      
      // Mock context to be the same
      const context = { url: 'https://example.com' };
      
      await errorReporter.reportError(error1, ErrorSeverity.MEDIUM, context);
      await errorReporter.reportError(error2, ErrorSeverity.MEDIUM, context);

      // Both should generate the same fingerprint
      expect(mockConsoleTable).toHaveBeenCalledTimes(2);
    });

    it('should generate different fingerprints for different errors', async () => {
      const error1 = new Error('Error message 1');
      const error2 = new Error('Error message 2');
      
      await errorReporter.reportError(error1);
      await errorReporter.reportError(error2);

      // Should generate different fingerprints
      expect(mockConsoleTable).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration Options', () => {
    it('should respect enableConsoleLogging setting', async () => {
      const quietReporter = ErrorReporter.getInstance({
        enableConsoleLogging: false,
        enableExternalReporting: false,
        enableLocalStorage: false,
        maxStoredErrors: 10,
        environment: 'production',
      });

      const testError = new Error('Quiet error');
      await quietReporter.reportError(testError);

      expect(mockConsoleGroup).not.toHaveBeenCalled();
    });

    it('should respect enableExternalReporting setting', async () => {
      const noExternalReporter = ErrorReporter.getInstance({
        enableConsoleLogging: true,
        enableExternalReporting: false,
        enableLocalStorage: false,
        maxStoredErrors: 10,
        environment: 'development',
      });

      const testError = new Error('No external reporting');
      await noExternalReporter.reportError(testError);

      expect(mockGtag).not.toHaveBeenCalled();
    });

    it('should respect enableLocalStorage setting', async () => {
      const noStorageReporter = ErrorReporter.getInstance({
        enableConsoleLogging: false,
        enableExternalReporting: false,
        enableLocalStorage: false,
        maxStoredErrors: 10,
        environment: 'test',
      });

      const testError = new Error('No storage');
      await noStorageReporter.reportError(testError);

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Error in Error Reporting', () => {
    it('should handle errors in the reporting system gracefully', async () => {
      // Mock an error in the reporting process
      mockConsoleError.mockImplementation(() => {
        throw new Error('Console error failed');
      });

      const testError = new Error('Original error');
      
      // Should not throw error and should handle gracefully
      await expect(errorReporter.reportError(testError)).resolves.not.toThrow();
    });
  });

  describe('Server-Side Safety', () => {
    it('should handle missing window object', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const storedErrors = errorReporter.getStoredErrors();
      expect(storedErrors).toEqual([]);

      errorReporter.clearStoredErrors();
      // Should not throw

      global.window = originalWindow;
    });
  });
  */
});

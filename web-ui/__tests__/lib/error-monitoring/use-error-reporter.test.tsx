/**
 * @jest-environment jsdom
 */
import React from 'react';
import { renderHook, act, render } from '@testing-library/react';

// Create mock error reporter
const mockReportError = jest.fn();

// Mock the error reporter module directly
jest.mock('@/lib/error-monitoring/error-reporter', () => ({
  errorReporter: {
    reportError: mockReportError,
  },
  ErrorSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
}));

import { useErrorReporter } from '@/lib/error-monitoring/use-error-reporter';
import { ErrorSeverity } from '@/lib/error-monitoring/error-reporter';

describe('useErrorReporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reportError', () => {
    it('should report error with default severity', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Test error');

      await act(async () => {
        result.current.reportError(testError);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.MEDIUM,
        expect.objectContaining({
          breadcrumbs: ['component-error'],
        })
      );
    });

    it('should report error with custom severity', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Critical test error');

      await act(async () => {
        result.current.reportError(testError, ErrorSeverity.CRITICAL);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.CRITICAL,
        expect.objectContaining({
          breadcrumbs: ['component-error'],
        })
      );
    });

    it('should report error with additional context', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Context test error');
      const additionalContext = {
        componentName: 'TestComponent',
        userId: 'user123',
        breadcrumbs: ['user-action'],
      };

      await act(async () => {
        result.current.reportError(testError, ErrorSeverity.HIGH, additionalContext);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.HIGH,
        expect.objectContaining({
          componentName: 'TestComponent',
          userId: 'user123',
          breadcrumbs: ['component-error', 'user-action'],
        })
      );
    });

    it('should handle non-Error objects', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const stringError = 'String error message';

      await act(async () => {
        result.current.reportError(stringError);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        stringError,
        ErrorSeverity.MEDIUM,
        expect.objectContaining({
          breadcrumbs: ['component-error'],
        })
      );
    });

    it('should preserve existing breadcrumbs', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Breadcrumb test');
      const context = {
        breadcrumbs: ['existing-breadcrumb', 'another-breadcrumb'],
      };

      await act(async () => {
        result.current.reportError(testError, ErrorSeverity.LOW, context);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.LOW,
        expect.objectContaining({
          breadcrumbs: ['component-error', 'existing-breadcrumb', 'another-breadcrumb'],
        })
      );
    });
  });

  describe('reportAsyncError', () => {
    it('should report async error with default severity', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Async test error');

      await act(async () => {
        await result.current.reportAsyncError(testError);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.MEDIUM,
        expect.objectContaining({
          breadcrumbs: ['async-component-error'],
        })
      );
    });

    it('should report async error with custom severity and context', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Async context test');
      const context = {
        operation: 'data-fetch',
        breadcrumbs: ['fetch-start'],
      };

      await act(async () => {
        await result.current.reportAsyncError(testError, ErrorSeverity.HIGH, context);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.HIGH,
        expect.objectContaining({
          operation: 'data-fetch',
          breadcrumbs: ['async-component-error', 'fetch-start'],
        })
      );
    });

    it('should return a promise', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Promise test');

      const reportPromise = result.current.reportAsyncError(testError);
      expect(reportPromise).toBeInstanceOf(Promise);

      await act(async () => {
        await reportPromise;
      });

      expect(mockReportError).toHaveBeenCalled();
    });
  });

  describe('reportUserAction', () => {
    it('should report user action error with default severity', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('User action error');
      const action = 'button-click';

      await act(async () => {
        result.current.reportUserAction(testError, action);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.LOW,
        expect.objectContaining({
          breadcrumbs: ['user-action', action],
          additionalData: { userAction: action },
        })
      );
    });

    it('should report user action error with custom severity', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Critical user action error');
      const action = 'delete-account';

      await act(async () => {
        result.current.reportUserAction(testError, action, ErrorSeverity.CRITICAL);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.CRITICAL,
        expect.objectContaining({
          breadcrumbs: ['user-action', action],
          additionalData: { userAction: action },
        })
      );
    });

    it('should handle complex action names', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Complex action error');
      const action = 'submit-form-with-validation';

      await act(async () => {
        result.current.reportUserAction(testError, action);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.LOW,
        expect.objectContaining({
          breadcrumbs: ['user-action', action],
          additionalData: { userAction: action },
        })
      );
    });
  });

  describe('reportApiError', () => {
    it('should report API error with default method and severity', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('API error');
      const endpoint = '/api/users';

      await act(async () => {
        result.current.reportApiError(testError, endpoint);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.MEDIUM,
        expect.objectContaining({
          breadcrumbs: ['api-error', 'GET', endpoint],
          additionalData: {
            endpoint,
            method: 'GET',
            errorType: 'api',
          },
        })
      );
    });

    it('should report API error with custom method and severity', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('POST API error');
      const endpoint = '/api/users';
      const method = 'POST';

      await act(async () => {
        result.current.reportApiError(testError, endpoint, method, ErrorSeverity.HIGH);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.HIGH,
        expect.objectContaining({
          breadcrumbs: ['api-error', 'POST', endpoint],
          additionalData: {
            endpoint,
            method: 'POST',
            errorType: 'api',
          },
        })
      );
    });

    it('should normalize HTTP method to uppercase', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Method normalization test');
      const endpoint = '/api/data';
      const method = 'patch';

      await act(async () => {
        result.current.reportApiError(testError, endpoint, method);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.MEDIUM,
        expect.objectContaining({
          breadcrumbs: ['api-error', 'PATCH', endpoint],
          additionalData: {
            endpoint,
            method: 'PATCH',
            errorType: 'api',
          },
        })
      );
    });

    it('should handle complex endpoint paths', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Complex endpoint error');
      const endpoint = '/api/v1/users/123/posts?limit=10&offset=20';

      await act(async () => {
        result.current.reportApiError(testError, endpoint);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.MEDIUM,
        expect.objectContaining({
          breadcrumbs: ['api-error', 'GET', endpoint],
          additionalData: {
            endpoint,
            method: 'GET',
            errorType: 'api',
          },
        })
      );
    });
  });

  describe('Hook Stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useErrorReporter());
      
      const firstRender = result.current;
      
      rerender();
      
      const secondRender = result.current;
      
      // All functions should be stable across renders
      expect(firstRender.reportError).toBe(secondRender.reportError);
      expect(firstRender.reportAsyncError).toBe(secondRender.reportAsyncError);
      expect(firstRender.reportUserAction).toBe(secondRender.reportUserAction);
      expect(firstRender.reportApiError).toBe(secondRender.reportApiError);
    });

    it('should not cause infinite re-renders when used in useEffect', () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const { reportError } = useErrorReporter();
        
        React.useEffect(() => {
          // This should not cause infinite re-renders
          if (renderCount === 1) {
            reportError(new Error('Effect test'));
          }
        }, [reportError]);
        
        return null;
      };

      const { rerender } = render(<TestComponent />);
      
      // Should only render once initially
      expect(renderCount).toBe(1);
      
      rerender(<TestComponent />);
      
      // Should not re-render due to stable function references
      expect(renderCount).toBe(2); // Only the explicit rerender
    });
  });

  describe('Error Handling in Hook Functions', () => {
    it('should handle errors in error reporting gracefully', async () => {
      mockReportError.mockRejectedValue(new Error('Reporting failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Original error');

      await act(async () => {
        // Should not throw even if underlying reporting fails
        await expect(result.current.reportAsyncError(testError)).resolves.not.toThrow();
      });

      consoleSpy.mockRestore();
    });

    it('should not affect component when reporting fails', async () => {
      mockReportError.mockImplementation(() => {
        throw new Error('Synchronous reporting failure');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Test error');

      await act(async () => {
        // Should not throw
        expect(() => result.current.reportError(testError)).not.toThrow();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Integration with Error Reporter', () => {
    it('should pass through all parameters correctly', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Integration test');
      const context = {
        userId: 'test-user',
        sessionId: 'test-session',
        customData: { key: 'value' },
      };

      await act(async () => {
        result.current.reportError(testError, ErrorSeverity.HIGH, context);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        testError,
        ErrorSeverity.HIGH,
        expect.objectContaining({
          userId: 'test-user',
          sessionId: 'test-session',
          customData: { key: 'value' },
          breadcrumbs: ['component-error'],
        })
      );
    });

    it('should work with different error severities', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const testError = new Error('Severity test');

      const severities = [
        ErrorSeverity.LOW,
        ErrorSeverity.MEDIUM,
        ErrorSeverity.HIGH,
        ErrorSeverity.CRITICAL,
      ];

      for (const severity of severities) {
        await act(async () => {
          result.current.reportError(testError, severity);
        });

        expect(mockReportError).toHaveBeenCalledWith(
          testError,
          severity,
          expect.any(Object)
        );
      }

      expect(mockReportError).toHaveBeenCalledTimes(4);
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should accept Error objects', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const error = new Error('Type test');

      await act(async () => {
        result.current.reportError(error);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        error,
        ErrorSeverity.MEDIUM,
        expect.any(Object)
      );
    });

    it('should accept unknown error types', async () => {
      const { result } = renderHook(() => useErrorReporter());
      const unknownError = { message: 'Unknown error type' };

      await act(async () => {
        result.current.reportError(unknownError);
      });

      expect(mockReportError).toHaveBeenCalledWith(
        unknownError,
        ErrorSeverity.MEDIUM,
        expect.any(Object)
      );
    });
  });
});
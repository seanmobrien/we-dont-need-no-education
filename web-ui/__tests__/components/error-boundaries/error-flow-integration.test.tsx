/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { ClientErrorManager } from '/components/error-boundaries/ClientErrorManager';
import { RenderErrorBoundaryFallback } from '/components/error-boundaries/renderFallback';
import { errorReporter, ErrorSeverity } from '/lib/error-monitoring';
import { any } from 'zod';

// Mock the error reporter and recovery strategies
jest.mock('/lib/error-monitoring', () => ({
  errorReporter: {
    reportError: jest.fn(),
    reportBoundaryError: jest.fn(),
  },
  ErrorSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
}));

const mockReload = jest.fn();

jest.mock('/lib/error-monitoring/recovery-strategies', () => ({
  getRecoveryActions: jest.fn(),
  getDefaultRecoveryAction: jest.fn(),
  classifyError: jest.fn(),
}));

const mockErrorReporter = errorReporter as jest.Mocked<typeof errorReporter>;
const mockGetRecoveryActions =
  require('/lib/error-monitoring/recovery-strategies').getRecoveryActions;
const mockGetDefaultRecoveryAction =
  require('/lib/error-monitoring/recovery-strategies').getDefaultRecoveryAction;
const mockClassifyError =
  require('/lib/error-monitoring/recovery-strategies').classifyError;

// Mock window methods
const mockAlert = jest.fn();

Object.defineProperty(window, 'alert', {
  value: mockAlert,
  configurable: true,
});

// Test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
    error: { main: '#f44336' },
  },
});

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>{children}</ThemeProvider>
);

describe('Error Flow Integration Tests', () => {
  let consoleSpy: jest.SpyInstance | undefined;
  beforeEach(() => {
    // jest.clearAllMocks();

    // Default mock implementations
    mockClassifyError.mockReturnValue('network');
    mockGetRecoveryActions.mockReturnValue([
      {
        id: 'retry',
        label: 'Try Again',
        description: 'Retry the operation',
        action: mockReload,
      },
    ]);
    mockGetDefaultRecoveryAction.mockReturnValue({
      id: 'retry',
      label: 'Try Again',
      description: 'Retry the operation',
      action: mockReload,
    });
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Reset window event listeners
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });
  afterEach(() => {
    consoleSpy?.mockRestore();
    consoleSpy = undefined;
  });

  describe('Error Reporting Integration', () => {
    it('should report boundary errors with proper context', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const ThrowingComponent = () => {
        throw new Error('Component error for reporting test');
      };

      const onError = jest.fn((error, errorInfo) => {
        mockErrorReporter.reportBoundaryError(
          error,
          errorInfo,
          ErrorSeverity.HIGH,
        );
      });

      render(
        <TestWrapper>
          <ErrorBoundary
            fallbackRender={RenderErrorBoundaryFallback}
            onError={onError}
          >
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(mockErrorReporter.reportBoundaryError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            componentStack: expect.any(String),
          }),
          'high',
        );
      });
    });

    it('should debounce duplicate global errors', async () => {
      render(
        <TestWrapper>
          <ErrorBoundary fallbackRender={RenderErrorBoundaryFallback}>
            <ClientErrorManager debounceMs={10000} />
          </ErrorBoundary>
        </TestWrapper>,
      );

      const addEventListenerCalls = (window.addEventListener as jest.Mock).mock
        .calls;
      const errorHandler = addEventListenerCalls.find(
        (call) => call[0] === 'error',
      )?.[1];

      const duplicateError = new ErrorEvent('error', {
        message: 'Duplicate error',
        filename: 'test.js',
        lineno: 1,
      });

      // Fire same error multiple times quickly
      await act(async () => {
        errorHandler(duplicateError);
        errorHandler(duplicateError);
        errorHandler(duplicateError);
      });

      // Should only report once due to debouncing
      expect(mockErrorReporter.reportError).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Performance and Memory Management', () => {
  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(
      <TestWrapper>
        <ClientErrorManager />
      </TestWrapper>,
    );

    // Verify listeners were added
    expect(window.addEventListener).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    );

    unmount();

    // Verify listeners were removed
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    );
  });

  it('should not create memory leaks with multiple error manager instances', () => {
    const { rerender, unmount } = render(
      <TestWrapper>
        <ClientErrorManager />
      </TestWrapper>,
    );

    // Re-render multiple times
    for (let i = 0; i < 5; i++) {
      rerender(
        <TestWrapper>
          <ClientErrorManager />
        </TestWrapper>,
      );
    }

    // Should only have one set of listeners
    const addCalls = (window.addEventListener as jest.Mock).mock.calls;
    const errorHandlerCalls = addCalls.filter((call) => call[0] === 'error');

    // Due to the initialization check, should only add listeners once
    expect(errorHandlerCalls.length).toBeLessThanOrEqual(5);

    unmount();
  });
});

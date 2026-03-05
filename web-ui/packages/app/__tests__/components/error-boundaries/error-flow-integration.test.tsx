/**
 * @jest-environment jsdom
 */

import React from 'react';
import {
  render,
  waitFor,
  act,
  hideConsoleOutput,
} from '../../shared/test-utils';
// import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { ClientErrorManager } from '../../../components/error-boundaries/ClientErrorManager';
import { RenderErrorBoundaryFallback } from '../../../components/error-boundaries/render-fallback';
import {
  errorReporter,
  ErrorSeverity,
  ErrorReporterInterface,
} from '@compliance-theater/logger/errors/monitoring';
import { RenderFallbackFromBoundary } from '../../../components/error-boundaries';

// Mock the error reporter and recovery strategies
/*
jest.mock('@compliance-theater/logger/errors/monitoring', () => {
  const originalModule = jest.requireActual('@compliance-theater/logger/errors/monitoring');
  const mockErrorReporter = jest.fn();
  return {
    ...originalModule,
    __esModule: true,
    errorReporter: mockErrorReporter,
  };
});
*/

const mockReload = jest.fn();

jest.mock(
  '@compliance-theater/logger/errors/monitoring/recovery-strategies',
  () => ({
    getRecoveryActions: jest.fn(),
    getDefaultRecoveryAction: jest.fn(),
    classifyError: jest.fn(),
  }),
);

const mockGetRecoveryActions =
  require('@compliance-theater/logger/errors/monitoring/recovery-strategies').getRecoveryActions;
const mockGetDefaultRecoveryAction =
  require('@compliance-theater/logger/errors/monitoring/recovery-strategies').getDefaultRecoveryAction;
const mockClassifyError =
  require('@compliance-theater/logger/errors/monitoring/recovery-strategies').classifyError;

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

class LocalErrorBoundary extends React.Component<
  {
    FallbackComponent?: React.ComponentType<{
      error: Error;
      resetErrorBoundary: () => void;
    }>;
    onError?: (error: Error, info: { componentStack: string }) => void;
    children?: React.ReactNode;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: unknown) {
    this.props.onError?.(error, { componentStack: 'test-component-stack' });
  }

  render() {
    if (this.state.hasError && this.props.FallbackComponent) {
      const Fallback = this.props.FallbackComponent;
      return React.createElement(Fallback, {
        error: this.state.error ?? new Error('unknown error'),
        resetErrorBoundary: () => this.setState({ hasError: false }),
      });
    }
    return this.props.children;
  }
}

const consoleSpy = hideConsoleOutput();

describe('Error Flow Integration Tests', () => {
  let mockErrorReporter: jest.Mocked<ErrorReporterInterface>;
  beforeEach(() => {
    mockErrorReporter = errorReporter() as jest.Mocked<ErrorReporterInterface>;
    mockReload.mockClear();
    mockAlert.mockClear();
    mockClassifyError.mockClear();
    mockGetRecoveryActions.mockClear();
    mockGetDefaultRecoveryAction.mockClear();
    mockErrorReporter.reportError.mockClear();
    mockErrorReporter.reportBoundaryError.mockClear();
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
    // Reset window event listeners
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });
  afterEach(() => {
    consoleSpy.dispose();
  });

  describe('Error Reporting Integration', () => {
    it.skip('should report boundary errors with proper context', async () => {
      consoleSpy.setup();
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
          <LocalErrorBoundary
            FallbackComponent={RenderFallbackFromBoundary}
            onError={onError}
          >
            <ThrowingComponent />
          </LocalErrorBoundary>
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
    }, 15000);

    it('should debounce duplicate global errors', async () => {
      render(
        <TestWrapper>
          <LocalErrorBoundary FallbackComponent={RenderFallbackFromBoundary}>
            <ClientErrorManager debounceMs={10000} />
          </LocalErrorBoundary>
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
    }, 15000);
  });
});

describe('Performance and Memory Management', () => {
  type EventListenerState = {
    addEventListener?: typeof window.addEventListener;
    removeEventListener?: typeof window.removeEventListener;
  };
  const eventListenerState: EventListenerState = {};

  beforeEach(() => {
    eventListenerState.addEventListener = window.addEventListener;
    eventListenerState.removeEventListener = window.removeEventListener;
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    const restoreIt = (method: 'addEventListener' | 'removeEventListener') => {
      if (jest.isMockFunction(window[method])) {
        window[method].mockRestore();
      }
      window[method] = eventListenerState[method] ?? window[method];
    };
    restoreIt('addEventListener');
    restoreIt('removeEventListener');
  });

  it('should clean up event listeners on unmount', () => {
    consoleSpy.setup();
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
    consoleSpy.setup();
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

    unmount();

    const addCalls = (window.addEventListener as jest.Mock).mock.calls;
    const removeCalls = (window.removeEventListener as jest.Mock).mock.calls;
    const errorAddCalls = addCalls.filter((call) => call[0] === 'error');
    const errorRemoveCalls = removeCalls.filter((call) => call[0] === 'error');

    // Ensure all registered listeners are cleaned up
    expect(errorRemoveCalls.length).toBe(errorAddCalls.length);
  });
});

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { ErrorBoundary } from 'react-error-boundary';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { ClientErrorManager } from '@/components/error-boundaries/ClientErrorManager';
import { errorReporter, ErrorSeverity, } from '@/lib/error-monitoring';
import { hideConsoleOutput } from '@/__tests__/test-utils';
import { RenderFallbackFromBoundary } from '@/components/error-boundaries';
const mockReload = jest.fn();
jest.mock('@/lib/error-monitoring/recovery-strategies', () => ({
    getRecoveryActions: jest.fn(),
    getDefaultRecoveryAction: jest.fn(),
    classifyError: jest.fn(),
}));
const mockGetRecoveryActions = require('/lib/error-monitoring/recovery-strategies').getRecoveryActions;
const mockGetDefaultRecoveryAction = require('/lib/error-monitoring/recovery-strategies').getDefaultRecoveryAction;
const mockClassifyError = require('/lib/error-monitoring/recovery-strategies').classifyError;
const mockAlert = jest.fn();
Object.defineProperty(window, 'alert', {
    value: mockAlert,
    configurable: true,
});
const testTheme = createTheme({
    palette: {
        mode: 'light',
        error: { main: '#f44336' },
    },
});
const TestWrapper = ({ children }) => (<ThemeProvider theme={testTheme}>{children}</ThemeProvider>);
const consoleSpy = hideConsoleOutput();
describe('Error Flow Integration Tests', () => {
    let mockErrorReporter;
    beforeEach(() => {
        mockErrorReporter = errorReporter();
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
        window.addEventListener = jest.fn();
        window.removeEventListener = jest.fn();
    });
    afterEach(() => {
        consoleSpy.dispose();
    });
    describe('Error Reporting Integration', () => {
        it('should report boundary errors with proper context', async () => {
            consoleSpy.setup();
            const ThrowingComponent = () => {
                throw new Error('Component error for reporting test');
            };
            const onError = jest.fn((error, errorInfo) => {
                mockErrorReporter.reportBoundaryError(error, errorInfo, ErrorSeverity.HIGH);
            });
            render(<TestWrapper>
          <ErrorBoundary FallbackComponent={RenderFallbackFromBoundary} onError={onError}>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>);
            await waitFor(() => {
                expect(mockErrorReporter.reportBoundaryError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
                    componentStack: expect.any(String),
                }), 'high');
            });
        }, 15000);
        it('should debounce duplicate global errors', async () => {
            render(<TestWrapper>
          <ErrorBoundary FallbackComponent={RenderFallbackFromBoundary}>
            <ClientErrorManager debounceMs={10000}/>
          </ErrorBoundary>
        </TestWrapper>);
            const addEventListenerCalls = window.addEventListener.mock
                .calls;
            const errorHandler = addEventListenerCalls.find((call) => call[0] === 'error')?.[1];
            const duplicateError = new ErrorEvent('error', {
                message: 'Duplicate error',
                filename: 'test.js',
                lineno: 1,
            });
            await act(async () => {
                errorHandler(duplicateError);
                errorHandler(duplicateError);
                errorHandler(duplicateError);
            });
            expect(mockErrorReporter.reportError).toHaveBeenCalledTimes(1);
        }, 15000);
    });
});
describe('Performance and Memory Management', () => {
    it('should clean up event listeners on unmount', () => {
        consoleSpy.setup();
        const { unmount } = render(<TestWrapper>
        <ClientErrorManager />
      </TestWrapper>);
        expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
        expect(window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        unmount();
        expect(window.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
        expect(window.removeEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });
    it('should not create memory leaks with multiple error manager instances', () => {
        consoleSpy.setup();
        const { rerender, unmount } = render(<TestWrapper>
        <ClientErrorManager />
      </TestWrapper>);
        for (let i = 0; i < 5; i++) {
            rerender(<TestWrapper>
          <ClientErrorManager />
        </TestWrapper>);
        }
        const addCalls = window.addEventListener.mock.calls;
        const errorHandlerCalls = addCalls.filter((call) => call[0] === 'error');
        expect(errorHandlerCalls.length).toBeLessThanOrEqual(5);
        unmount();
    });
});
//# sourceMappingURL=error-flow-integration.test.jsx.map
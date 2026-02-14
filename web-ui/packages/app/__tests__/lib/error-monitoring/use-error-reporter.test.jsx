import React from 'react';
import { renderHook, act, render, waitFor, screen, } from '@testing-library/react';
import { errorReporter, ErrorSeverity, } from '@/lib/error-monitoring';
import { useErrorReporter } from '@/lib/error-monitoring/use-error-reporter';
import { hideConsoleOutput } from '@/__tests__/test-utils';
const mockConsole = hideConsoleOutput();
describe('useErrorReporter', () => {
    let mockReportError;
    let mockErrorReporter;
    beforeEach(() => {
        mockErrorReporter = errorReporter();
        mockReportError = mockErrorReporter.reportError;
        mockConsole.setup();
    });
    afterEach(() => {
        mockConsole.dispose();
    });
    describe('reportError', () => {
        it('should report error with default severity', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Test error');
            await act(async () => {
                result.current.reportError(testError);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.MEDIUM, expect.objectContaining({
                breadcrumbs: ['component-error'],
            }));
        });
        it('should report error with custom severity', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Critical test error');
            await act(async () => {
                result.current.reportError(testError, ErrorSeverity.CRITICAL);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.CRITICAL, expect.objectContaining({
                breadcrumbs: ['component-error'],
            }));
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
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.HIGH, expect.objectContaining({
                componentName: 'TestComponent',
                userId: 'user123',
                breadcrumbs: ['component-error', 'user-action'],
            }));
        });
        it('should handle non-Error objects', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const stringError = 'String error message';
            await act(async () => {
                result.current.reportError(stringError);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(stringError, ErrorSeverity.MEDIUM, expect.objectContaining({
                breadcrumbs: ['component-error'],
            }));
        });
        it('should preserve existing breadcrumbs', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Breadcrumb test');
            const context = {
                breadcrumbs: ['existing-breadcrumb', 'another-breadcrumb'],
            };
            await act(async () => {
                result.current.reportError(testError, ErrorSeverity.LOW, context);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.LOW, expect.objectContaining({
                breadcrumbs: [
                    'component-error',
                    'existing-breadcrumb',
                    'another-breadcrumb',
                ],
            }));
        });
    });
    describe('reportAsyncError', () => {
        it('should report async error with default severity', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Async test error');
            await act(async () => {
                result.current.reportAsyncError(testError);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.MEDIUM, expect.objectContaining({
                breadcrumbs: ['async-component-error'],
            }));
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
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.HIGH, expect.objectContaining({
                operation: 'data-fetch',
                breadcrumbs: ['async-component-error', 'fetch-start'],
            }));
        });
        it('should return a promise', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Promise test');
            let reportPromise = undefined;
            await act(async () => {
                reportPromise = result.current.reportAsyncError(testError);
                expect(reportPromise).toBeInstanceOf(Promise);
                await reportPromise;
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
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
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.LOW, expect.objectContaining({
                breadcrumbs: ['user-action', action],
                additionalData: { userAction: action },
            }));
        });
        it('should report user action error with custom severity', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Critical user action error');
            const action = 'delete-account';
            await act(async () => {
                result.current.reportUserAction(testError, action, ErrorSeverity.CRITICAL);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.CRITICAL, expect.objectContaining({
                breadcrumbs: ['user-action', action],
                additionalData: { userAction: action },
            }));
        });
        it('should handle complex action names', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Complex action error');
            const action = 'submit-form-with-validation';
            await act(async () => {
                result.current.reportUserAction(testError, action);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.LOW, expect.objectContaining({
                breadcrumbs: ['user-action', action],
                additionalData: { userAction: action },
            }));
        });
    });
    describe('reportApiError', () => {
        it('should report API error with default method and severity', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('API error');
            const endpoint = '/api/users';
            await act(async () => {
                result.current.reportApiError(testError, endpoint);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.MEDIUM, expect.objectContaining({
                breadcrumbs: ['api-error', 'GET', endpoint],
                additionalData: {
                    endpoint,
                    method: 'GET',
                    errorType: 'api',
                },
            }));
        });
        it('should report API error with custom method and severity', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('POST API error');
            const endpoint = '/api/users';
            const method = 'POST';
            await act(async () => {
                result.current.reportApiError(testError, endpoint, method, ErrorSeverity.HIGH);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.HIGH, expect.objectContaining({
                breadcrumbs: ['api-error', 'POST', endpoint],
                additionalData: {
                    endpoint,
                    method: 'POST',
                    errorType: 'api',
                },
            }));
        });
        it('should normalize HTTP method to uppercase', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Method normalization test');
            const endpoint = '/api/data';
            const method = 'patch';
            await act(async () => {
                result.current.reportApiError(testError, endpoint, method);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.MEDIUM, expect.objectContaining({
                breadcrumbs: ['api-error', 'PATCH', endpoint],
                additionalData: {
                    endpoint,
                    method: 'PATCH',
                    errorType: 'api',
                },
            }));
        });
        it('should handle complex endpoint paths', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Complex endpoint error');
            const endpoint = '/api/v1/users/123/posts?limit=10&offset=20';
            await act(async () => {
                result.current.reportApiError(testError, endpoint);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.MEDIUM, expect.objectContaining({
                breadcrumbs: ['api-error', 'GET', endpoint],
                additionalData: {
                    endpoint,
                    method: 'GET',
                    errorType: 'api',
                },
            }));
        });
    });
    describe('Hook Stability', () => {
        it('should not cause infinite re-renders when used in useEffect', async () => {
            let renderCount = 0;
            const TestComponent = () => {
                renderCount++;
                const { reportError } = useErrorReporter();
                const [effectTriggered, setEffectTriggered] = React.useState(false);
                React.useEffect(() => {
                    if (renderCount === 1) {
                        reportError(new Error('Effect test'));
                    }
                    if (!effectTriggered) {
                        setEffectTriggered(true);
                    }
                }, [reportError, effectTriggered]);
                return (<div>
            {effectTriggered && (<span data-testid="effect-triggered">Effect Triggered</span>)}
          </div>);
            };
            const { rerender } = render(<TestComponent />);
            await act(async () => {
                await waitFor(() => expect(screen.getByTestId('effect-triggered')).toBeInTheDocument());
            });
            expect(renderCount).toBe(2);
            rerender(<TestComponent />);
            await act(async () => {
                await waitFor(() => expect(screen.getByTestId('effect-triggered')).toBeInTheDocument());
            });
            expect(renderCount).toBe(3);
        });
    });
    describe('Error Handling in Hook Functions', () => {
        it('should handle errors in error reporting gracefully', async () => {
            mockReportError.mockRejectedValue(new Error('Reporting failed'));
            mockConsole.setup();
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Original error');
            await act(async () => {
                const promise = result.current.reportAsyncError(testError);
                await waitFor(() => expect(promise).resolves.not.toThrow());
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
        }, 15000);
        it('should not affect component when reporting fails', async () => {
            mockReportError.mockImplementation(() => {
                throw new Error('Synchronous reporting failure');
            });
            mockConsole.setup();
            const { result } = renderHook(() => useErrorReporter());
            const testError = new Error('Test error');
            await act(async () => {
                result.current.reportError(testError);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
        }, 15000);
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
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(testError, ErrorSeverity.HIGH, expect.objectContaining({
                userId: 'test-user',
                sessionId: 'test-session',
                customData: { key: 'value' },
                breadcrumbs: ['component-error'],
            }));
        });
        it('should work with different error severities', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const severities = [
                ErrorSeverity.LOW,
                ErrorSeverity.MEDIUM,
                ErrorSeverity.HIGH,
                ErrorSeverity.CRITICAL,
            ];
            await act(async () => {
                const thisError = new Error(`Severity test ${severities[0]}`);
                result.current.reportError(thisError, severities[0]);
                await waitFor(() => expect(mockReportError).toHaveBeenCalledWith(thisError, severities[0], expect.any(Object)));
            });
            await act(async () => {
                const thisError = new Error(`Severity test ${severities[1]}`);
                result.current.reportError(thisError, severities[1]);
                await waitFor(() => expect(mockReportError).toHaveBeenCalledWith(thisError, severities[1], expect.any(Object)));
            });
            await act(async () => {
                const thisError = new Error(`Severity test ${severities[2]}`);
                result.current.reportError(thisError, severities[2]);
                await waitFor(() => expect(mockReportError).toHaveBeenCalledWith(thisError, severities[2], expect.any(Object)));
            });
            await act(async () => {
                const thisError = new Error(`Severity test ${severities[3]}`);
                result.current.reportError(thisError, severities[3]);
                await waitFor(() => expect(mockReportError).toHaveBeenCalledWith(thisError, severities[3], expect.any(Object)));
            });
            expect(mockReportError).toHaveBeenCalledTimes(4);
        }, 15000);
    });
    describe('TypeScript Type Safety', () => {
        it('should accept Error objects', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const error = new Error('Type test');
            await act(async () => {
                result.current.reportError(error);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(error, ErrorSeverity.MEDIUM, expect.any(Object));
        });
        it('should accept unknown error types', async () => {
            const { result } = renderHook(() => useErrorReporter());
            const unknownError = { message: 'Unknown error type' };
            await act(async () => {
                result.current.reportError(unknownError);
                await waitFor(() => expect(mockReportError).toHaveBeenCalled());
            });
            expect(mockReportError).toHaveBeenCalledWith(unknownError, ErrorSeverity.MEDIUM, expect.any(Object));
        });
    });
});
//# sourceMappingURL=use-error-reporter.test.jsx.map
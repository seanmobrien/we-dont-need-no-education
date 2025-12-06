/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import {
  ClientErrorManager,
  createSuppressionRule,
} from '@/components/error-boundaries/ClientErrorManager';
import {
  type ErrorReporterInterface,
  errorReporter,
} from '@/lib/error-monitoring';

// Mock window methods that might not be available in test environment
const mockConsoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {});
const mockPreventDefault = jest.fn();

describe('ClientErrorManager', () => {
  let mockErrorReporter: jest.Mocked<ErrorReporterInterface>;

  beforeEach(() => {
    mockErrorReporter = errorReporter() as jest.Mocked<ErrorReporterInterface>;
    // jest.clearAllMocks();
    mockConsoleError.mockClear();

    // Reset global error handlers
    const existingHandlers = window.addEventListener;
    window.removeEventListener = jest.fn();
    window.addEventListener = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Error Suppression', () => {
    it('should suppress AI content blob errors by default', async () => {
      const { unmount } = render(<ClientErrorManager />);

      // Create a mock error event
      const errorEvent = new ErrorEvent('error', {
        message:
          'AI (Internal): 102 message:"Invalid content blob. Missing required attributes (id, contentName)',
        filename: 'app.js',
        lineno: 123,
        colno: 45,
      });

      // Override preventDefault
      errorEvent.preventDefault = mockPreventDefault;

      // Get the error handler that was registered
      const addEventListenerCalls = (window.addEventListener as jest.Mock).mock
        .calls;
      const errorHandler = addEventListenerCalls.find(
        (call) => call[0] === 'error',
      )?.[1];

      expect(errorHandler).toBeDefined();

      // Trigger the error
      await act(async () => {
        errorHandler(errorEvent);
      });

      // Should prevent default and not report to error reporter
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockErrorReporter.reportError).not.toHaveBeenCalled();

      unmount();
    });

    it('should suppress browser extension errors', async () => {
      const { unmount } = render(<ClientErrorManager />);

      const errorEvent = new ErrorEvent('error', {
        message: 'Error from chrome-extension://some-extension',
        filename: 'chrome-extension://some-extension/script.js',
      });
      errorEvent.preventDefault = mockPreventDefault;

      const addEventListenerCalls = (window.addEventListener as jest.Mock).mock
        .calls;
      const errorHandler = addEventListenerCalls.find(
        (call) => call[0] === 'error',
      )?.[1];

      await act(async () => {
        errorHandler(errorEvent);
      });

      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockErrorReporter.reportError).not.toHaveBeenCalled();

      unmount();
    });

    it('should allow custom suppression rules', async () => {
      const customRules = [
        createSuppressionRule('test-error', /test error pattern/i, {
          suppressCompletely: true,
        }),
      ];

      const { unmount } = render(
        <ClientErrorManager suppressionRules={customRules} />,
      );

      const errorEvent = new ErrorEvent('error', {
        message: 'Test Error Pattern detected',
      });
      errorEvent.preventDefault = mockPreventDefault;

      const addEventListenerCalls = (window.addEventListener as jest.Mock).mock
        .calls;
      const errorHandler = addEventListenerCalls.find(
        (call) => call[0] === 'error',
      )?.[1];

      await act(async () => {
        errorHandler(errorEvent);
      });

      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockErrorReporter.reportError).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe('Configuration', () => {
    it('should respect reportSuppressedErrors setting', async () => {
      // Use a custom suppression rule that doesn't suppress completely
      const customRules = [
        createSuppressionRule(
          'test-suppression',
          /Test suppressed error/i,
          { suppressCompletely: false }, // This allows reporting when reportSuppressedErrors is true
        ),
      ];

      const { unmount } = render(
        <ClientErrorManager
          reportSuppressedErrors={true}
          suppressionRules={customRules}
        />,
      );

      const errorEvent = new ErrorEvent('error', {
        message: 'Test suppressed error message',
      });
      errorEvent.preventDefault = mockPreventDefault;

      const addEventListenerCalls = (window.addEventListener as jest.Mock).mock
        .calls;
      const errorHandler = addEventListenerCalls.find(
        (call) => call[0] === 'error',
      )?.[1];

      await act(async () => {
        errorHandler(errorEvent);
      });

      // Should still prevent default but report with low severity
      expect(mockPreventDefault).toHaveBeenCalled();
      expect(mockErrorReporter.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Error',
          message: 'Test suppressed error message',
        }),
        'low',
        expect.objectContaining({
          breadcrumbs: ['global-error-suppressed'],
        }),
      );

      unmount();
    });

    it('should not surface to boundary when disabled', async () => {
      const { unmount } = render(
        <ClientErrorManager surfaceToErrorBoundary={false} />,
      );

      const errorEvent = new ErrorEvent('error', {
        message: 'Regular error that should not surface',
      });

      const addEventListenerCalls = (window.addEventListener as jest.Mock).mock
        .calls;
      const errorHandler = addEventListenerCalls.find(
        (call) => call[0] === 'error',
      )?.[1];

      await act(async () => {
        errorHandler(errorEvent);
      });

      // Should report error but not surface to boundary
      expect(mockErrorReporter.reportError).toHaveBeenCalled();
      // The component should not try to setState to trigger boundary

      unmount();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = render(<ClientErrorManager />);

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
  });

  describe('Helper Functions', () => {
    describe('createSuppressionRule', () => {
      it('should create a suppression rule with correct properties', () => {
        const rule = createSuppressionRule('test-rule', /test pattern/i, {
          source: /test-source/,
          suppressCompletely: true,
          reason: 'Test reason',
        });

        expect(rule).toEqual({
          id: 'test-rule',
          pattern: /test pattern/i,
          source: /test-source/,
          suppressCompletely: true,
          reason: 'Test reason',
        });
      });

      it('should create a suppression rule with minimal properties', () => {
        const rule = createSuppressionRule('minimal-rule', 'simple pattern');

        expect(rule).toEqual({
          id: 'minimal-rule',
          pattern: 'simple pattern',
        });
      });
    });
  });
});

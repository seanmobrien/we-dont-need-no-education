jest.mock('../src/otel/metrics-recorder', () => ({
  MetricsRecorder: {
    recordError: jest.fn(),
    recordOperationDuration: jest.fn(),
  },
}));

jest.mock('../src/otel/trace', () => ({
  DEBUG_MODE: true,
  tracer: jest.fn(),
}));

jest.mock('../src/core', () => ({
  log: jest.fn(),
}));

jest.mock('../src/with-timeout', () => ({
  withTimeoutAsError: jest.fn(),
}));

jest.mock('../src/errors/logged-error/logged-error-class', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

import { SpanStatusCode } from '@opentelemetry/api';
import { log } from '../src/core';
import { MetricsRecorder } from '../src/otel/metrics-recorder';
import { tracer } from '../src/otel/trace';
import { withTimeoutAsError } from '../src/with-timeout';
import { LoggedError } from '../src/errors/logged-error/logged-error-class';
import {
  SafeOperation,
  createSafeAsyncWrapper,
  createSafeErrorHandler,
} from '../src/safe-operation';

describe('SafeOperation', () => {
  const mockSpan = {
    addEvent: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (tracer as jest.Mock).mockReturnValue({
      startSpan: jest.fn(() => mockSpan),
    });
    (log as jest.Mock).mockImplementation((cb: (l: { error: jest.Mock; debug: jest.Mock }) => void) => {
      cb({ error: jest.fn(), debug: jest.fn() });
    });
    (LoggedError.isTurtlesAllTheWayDownBaby as jest.Mock).mockImplementation((error: unknown) => ({
      error,
      writeToLog: jest.fn(),
    }));
  });

  it('creates a safe error handler that catches wrapper errors', () => {
    const operation = new SafeOperation('url://safe');
    const unsafe = jest.fn(() => {
      throw new Error('handler-failed');
    });

    const safe = operation.createSafeErrorHandler(unsafe);
    safe(new Error('input-error'));

    expect(unsafe).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('wraps successful async operations with metrics and tracing', async () => {
    const operation = new SafeOperation('url://safe');
    const wrapped = operation.createSafeAsyncWrapper('send', async (value: number) => value + 1, jest.fn());

    await expect(wrapped(1)).resolves.toBe(2);

    expect(MetricsRecorder.recordOperationDuration).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'send', status: 'success' }),
    );
    expect(mockSpan.addEvent).toHaveBeenCalledWith('send.completed', expect.any(Object));
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('handles failed async operations with error metrics and logging', async () => {
    const operation = new SafeOperation('url://safe');
    const handler = jest.fn();
    const wrapped = operation.createSafeAsyncWrapper('receive', async () => {
      throw new Error('nope');
    }, handler);

    await expect(wrapped()).resolves.toBeUndefined();

    expect(MetricsRecorder.recordError).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'receive' }),
    );
    expect(MetricsRecorder.recordOperationDuration).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'receive', status: 'error' }),
    );
    expect(mockSpan.recordException).toHaveBeenCalled();
    expect(mockSpan.setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ code: SpanStatusCode.ERROR }),
    );
    expect(LoggedError.isTurtlesAllTheWayDownBaby).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('records and completes operation metrics', () => {
    const operation = new SafeOperation('url://safe');
    const id = operation.recordOperation('upload', 'm-1');

    operation.completeOperation(id, 'error');
    operation.completeOperation('does-not-exist');

    expect(MetricsRecorder.recordOperationDuration).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'upload', status: 'error' }),
    );
  });

  it('delegates timeout wrapper and top-level helper factories', async () => {
    const operation = new SafeOperation('url://safe');
    const promise = Promise.resolve('ok');
    (withTimeoutAsError as jest.Mock).mockReturnValueOnce(Promise.resolve('wrapped'));

    await expect(operation.withTimeout(promise, 123, 'x')).resolves.toBe('wrapped');
    expect(withTimeoutAsError).toHaveBeenCalledWith(promise, 123, 'x');

    const safeHandler = createSafeErrorHandler(() => {
      throw new Error('wrapped-error');
    });
    safeHandler('x');
    expect(log).toHaveBeenCalled();

    const helperWrapped = createSafeAsyncWrapper('helper', async () => 'ok', jest.fn());
    await expect(helperWrapped()).resolves.toBe('ok');
  });
});

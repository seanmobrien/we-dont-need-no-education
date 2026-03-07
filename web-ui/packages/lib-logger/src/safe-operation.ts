import { Span, SpanStatusCode } from '@opentelemetry/api';
import { DEBUG_MODE, tracer } from './otel/trace';
import { MetricsRecorder } from './otel/metrics-recorder';
import { isError } from './errors/utilities/error-guards';
import { LoggedError } from './errors/logged-error/logged-error-class';
import { log } from './core';
import { withTimeoutAsError } from './with-timeout';

export const CONNECTION_TIMEOUT_MS = 30 * 1000;
export const SEND_TIMEOUT_MS = 5 * 60 * 1000;

export interface OperationMetrics {
  startTime: number;
  operation: string;
  messageId?: string | number;
}

export class SafeOperation {
  #operationMetrics = new Map<string, OperationMetrics>();
  #url: string;

  constructor(url: string) {
    this.#url = url;
  }

  createSafeErrorHandler(
    handler: (error: unknown) => void
  ): (error: unknown) => void {
    return (error: unknown) => {
      try {
        handler(error);
      } catch (wrapperError) {
        log((l) =>
          l.error('Error handler failed', {
            data: {
              originalError: isError(error) ? error.message : String(error),
              wrapperError: isError(wrapperError)
                ? wrapperError.message
                : String(wrapperError),
            },
          })
        );
      }
    };
  }

  createSafeAsyncWrapper<T extends unknown[], R>(
    operationName: string,
    fn: (...args: T) => R | Promise<R>,
    errorHandler: (error: unknown) => void
  ): (...args: T) => Promise<R | void> {
    return async (...args: T): Promise<R | void> => {
      const startTime = Date.now();
      let span: Span | undefined;

      try {
        if (DEBUG_MODE) {
          span = tracer().startSpan(`safe-operation.${operationName}`, {
            attributes: {
              'safe-operation.name': operationName,
              'safe-operation.url': this.#url,
            },
          });
        }

        const result = await fn(...args);

        if (DEBUG_MODE) {
          const duration = Date.now() - startTime;
          MetricsRecorder.recordOperationDuration({
            duration,
            operation: operationName,
            status: 'success',
          });

          span?.addEvent(`${operationName}.completed`, {
            'safe-operation.duration_ms': duration,
          });
          span?.setStatus({ code: SpanStatusCode.OK });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        MetricsRecorder.recordError({
          operation: operationName,
          errorType: isError(error) ? error.name : 'unknown',
        });
        MetricsRecorder.recordOperationDuration({
          duration,
          operation: operationName,
          status: 'error',
        });

        span?.recordException(error as Error);
        span?.setStatus({
          code: SpanStatusCode.ERROR,
          message: isError(error) ? error.message : String(error),
        });

        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: false,
          source: operationName,
          include: { duration },
        });

        errorHandler(le);
        le.writeToLog({ source: operationName });
      } finally {
        span?.end();
      }
    };
  }

  recordOperation(operation: string, messageId?: string | number): string {
    const operationId = `${operation}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.#operationMetrics.set(operationId, {
      startTime: Date.now(),
      operation,
      messageId,
    });
    return operationId;
  }

  completeOperation(
    operationId: string,
    status: 'success' | 'error' = 'success'
  ) {
    const metrics = this.#operationMetrics.get(operationId);
    if (metrics) {
      const duration = Date.now() - metrics.startTime;
      MetricsRecorder.recordOperationDuration({
        duration,
        operation: metrics.operation,
        status,
      });
      this.#operationMetrics.delete(operationId);

      if (DEBUG_MODE) {
        log((l) =>
          l.debug(`Operation ${metrics.operation} completed`, {
            data: { duration, status, messageId: metrics.messageId },
          })
        );
      }
    }
  }

  withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation?: string) {
    return withTimeoutAsError(promise, timeoutMs, operation);
  }
}

export const createSafeErrorHandler = (
  handler: (error: unknown) => void,
  url?: string
) => new SafeOperation(url ?? 'url://null').createSafeErrorHandler(handler);

export const createSafeAsyncWrapper = <T extends unknown[], R>(
  operationName: string,
  fn: (...args: T) => R | Promise<R>,
  errorHandler: (error: unknown) => void,
  url?: string
) =>
  new SafeOperation(url ?? 'url://null').createSafeAsyncWrapper(
    operationName,
    fn,
    errorHandler
  );
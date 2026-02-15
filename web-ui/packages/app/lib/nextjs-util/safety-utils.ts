/**
 * @fileoverview Safety Utilities for MCP Transport
 *
 * This module provides error handling wrappers, timeout utilities, and
 * safe operation patterns.
 */

import { Span, SpanStatusCode } from '@opentelemetry/api';
import {
  tracer,
  MetricsRecorder,
  DEBUG_MODE,
} from '../ai/mcp/instrumented-sse-transport/metrics/otel-metrics';
import { isError, LoggedError, log } from '@compliance-theater/logger';
import { withTimeoutAsError } from '@compliance-theater/nextjs/with-timeout';

// Timeout constants
export const CONNECTION_TIMEOUT_MS = 30 * 1000; // 30 seconds for connection
export const SEND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for sending messages

export interface OperationMetrics {
  startTime: number;
  operation: string;
  messageId?: string | number;
}

/**
 * Provides safety utilities for async operations and error handling
 */
export class SafetyUtils {
  #operationMetrics = new Map<string, OperationMetrics>();
  #url: string;

  constructor(url: string) {
    this.#url = url;
  }

  /**
   * Creates a safe wrapper for error handlers that never throws
   */
  createSafeErrorHandler(
    handler: (error: unknown) => void
  ): (error: unknown) => void {
    return (error: unknown) => {
      try {
        handler(error);
      } catch (wrapperError) {
        // Last resort logging - error handler itself failed
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

  /**
   * Creates a safe async wrapper that catches all exceptions
   */
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
          // Create span as child of current active span
          span = tracer.startSpan(`mcp.transport.${operationName}`, {
            attributes: {
              'mcp.transport.operation': operationName,
              'mcp.transport.url': this.#url,
            },
          });
        }

        const result = await fn(...args);

        if (DEBUG_MODE) {
          const duration = Date.now() - startTime;
          MetricsRecorder.recordOperationDuration(
            duration,
            operationName,
            'success'
          );

          span?.addEvent(`${operationName}.completed`, {
            'mcp.transport.duration_ms': duration,
          });
          span?.setStatus({ code: SpanStatusCode.OK });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Record error metrics
        MetricsRecorder.recordError(
          operationName,
          isError(error) ? error.name : 'unknown'
        );
        MetricsRecorder.recordOperationDuration(
          duration,
          operationName,
          'error'
        );

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

  /**
   * Records operation metrics for detailed tracking
   */
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

  /**
   * Completes operation metrics tracking
   */
  completeOperation(
    operationId: string,
    status: 'success' | 'error' = 'success'
  ) {
    const metrics = this.#operationMetrics.get(operationId);
    if (metrics) {
      const duration = Date.now() - metrics.startTime;
      MetricsRecorder.recordOperationDuration(
        duration,
        metrics.operation,
        status
      );
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

  /**
   * Creates a timeout wrapper for async operations
   */
  withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation?: string) {
    return withTimeoutAsError(promise, timeoutMs, operation);
  }
}

export const createSafeErrorHandler = (
  handler: (error: unknown) => void,
  url?: string
) => new SafetyUtils(url ?? 'url://null').createSafeErrorHandler(handler);

export const createSafeAsyncWrapper = <T extends unknown[], R>(
  operationName: string,
  fn: (...args: T) => R | Promise<R>,
  errorHandler: (error: unknown) => void,
  url?: string
) =>
  new SafetyUtils(url ?? 'url://null').createSafeAsyncWrapper(
    operationName,
    fn,
    errorHandler
  );

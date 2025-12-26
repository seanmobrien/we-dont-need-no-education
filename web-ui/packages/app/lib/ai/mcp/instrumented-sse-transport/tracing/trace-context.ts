/**
 * @fileoverview Trace Context Management for MCP Transport
 *
 * This module handles distributed tracing support with trace context injection
 * for HTTP headers.
 */

import { trace } from '@opentelemetry/api';
import { log } from '@/lib/logger';
import { DEBUG_MODE } from '../metrics/otel-metrics';

/**
 * Manages trace context injection for distributed tracing
 */
export class TraceContextManager {
  /**
   * Static method to inject trace context into HTTP headers for distributed tracing
   * This can be called before the instance is created
   */
  static injectTraceContext(
    headers: Record<string, string> = {},
  ): Record<string, string> {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext.traceId && spanContext.spanId) {
        headers['traceparent'] =
          `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags?.toString(16).padStart(2, '0') || '01'}`;

        if (DEBUG_MODE) {
          log((l) =>
            l.debug('Injected trace context into headers (static)', {
              data: {
                traceId: spanContext.traceId,
                spanId: spanContext.spanId,
                traceFlags: spanContext.traceFlags,
              },
            }),
          );
        }
      }
    }
    return headers;
  }

  /**
   * Gets enhanced headers with trace context for HTTP requests
   * This method can be used by callers to get headers with trace context included
   */
  static getEnhancedHeaders(
    baseHeaders: Record<string, string> = {},
  ): Record<string, string> {
    return TraceContextManager.injectTraceContext(baseHeaders);
  }

  /**
   * Updates existing headers object with trace context in place
   * Returns true if trace context was injected, false otherwise
   */
  static updateHeadersWithTraceContext(
    headers: Record<string, string>,
  ): boolean {
    const originalKeyCount = Object.keys(headers).length;
    const enhancedHeaders = TraceContextManager.injectTraceContext(headers);

    // Copy new headers to the original object
    Object.assign(headers, enhancedHeaders);

    const wasInjected = Object.keys(headers).length > originalKeyCount;

    if (wasInjected && DEBUG_MODE) {
      log((l) =>
        l.debug('Trace context updated in existing headers', {
          data: {
            originalKeys: originalKeyCount,
            newKeys: Object.keys(headers).length,
          },
        }),
      );
    }

    return wasInjected;
  }
}

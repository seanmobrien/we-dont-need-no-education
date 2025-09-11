/**
 * @fileoverview Instrumented SSE MCP Transport Client with OpenTelemetry Support
 *
 * This module provides a comprehensive OpenTelemetry-instrumented wrapper around the base
 * Server-Sent Events (SSE) transport for Model Context Protocol (MCP) client connections.
 *
 * Features:
 * - Comprehensive OTEL metrics (connections, messages, errors, durations, sizes)
 * - Detailed tracing for all transport operations with parent/child span relationships
 * - Two operational modes: WARNING (high-level) and DEBUG (detailed)
 * - Robust error handling with safe async wrappers
 * - Session management with idle timeout handling
 * - Active session and tool call tracking with UpDownCounters
 * - Distributed tracing support with trace context injection
 * - Tool call lifecycle tracking from initiation to completion
 * - Manual counter reset and debugging utilities
 * - Timeout handling for async operations (connect, send)
 * - Type-safe message property access
 *
 * Environment Variables:
 * - MCP_OTEL_MODE: 'WARNING' (default) or 'DEBUG'
 *
 * Counter Management:
 * - Active sessions are tracked and automatically managed
 * - Tool calls are detected and tracked separately
 * - Counters never go negative and can be manually reset
 * - Debugging methods provide insight into current state
 *
 * Distributed Tracing:
 * - All spans created as children of current active span
 * - Trace context injection available for HTTP headers
 * - Session spans track entire tool call lifecycle
 * - Transport span tracks connection lifetime
 *
 * @module InstrumentedSseTransport
 * @version 1.1.0
 * @author NoEducation Project
 *
 * @legal
 * SPDX-License-Identifier: Apache-2.0
 *
 * This file incorporates code derived from Vercel's AI SDK,
 * which is licensed under the Apache License, Version 2.0.
 * See: https://github.com/vercel/ai
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { trace, Span, SpanStatusCode, metrics } from '@opentelemetry/api';
import { SseMCPTransport } from '../ai.sdk';
import type { JSONRPCMessage } from '../ai.sdk';

import { isAbortError, isError } from '@/lib/react-util/utility-methods';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { log } from '@/lib/logger';

// OTEL Configuration
const OTEL_MODE = process.env.MCP_OTEL_MODE?.toUpperCase() || 'WARNING'; // WARNING or DEBUG
const DEBUG_MODE = OTEL_MODE === 'DEBUG';

// OTEL Instrumentation
const tracer = trace.getTracer('mcp-client-transport', '1.0.0');
const meter = metrics.getMeter('mcp-client-transport', '1.0.0');

// Metrics
const connectionCounter = meter.createCounter('mcp_connections_total', {
  description: 'Total number of MCP connection attempts',
});

const messageCounter = meter.createCounter('mcp_messages_total', {
  description: 'Total number of MCP messages sent/received',
});

const errorCounter = meter.createCounter('mcp_errors_total', {
  description: 'Total number of MCP transport errors',
});

const sessionDurationHistogram = meter.createHistogram(
  'mcp_session_duration_ms',
  {
    description: 'Duration of MCP sessions in milliseconds',
  },
);

const messageSizeHistogram = meter.createHistogram('mcp_message_size_bytes', {
  description: 'Size of MCP messages in bytes',
});

const operationDurationHistogram = meter.createHistogram(
  'mcp_operation_duration_ms',
  {
    description: 'Duration of MCP operations in milliseconds',
  },
);

// Active counters for monitoring
const activeSessionsGauge = meter.createUpDownCounter('mcp_active_sessions', {
  description: 'Number of currently active MCP sessions',
});

const activeToolCallsGauge = meter.createUpDownCounter(
  'mcp_active_tool_calls',
  {
    description: 'Number of currently active MCP tool calls',
  },
);

const toolCallCounter = meter.createCounter('mcp_tool_calls_total', {
  description: 'Total number of MCP tool calls initiated',
});

const toolCallCompletionCounter = meter.createCounter(
  'mcp_tool_call_completions_total',
  {
    description: 'Total number of MCP tool call completions',
  },
);

interface SpanState {
  span: Span;
  idleTimer: ReturnType<typeof setTimeout>;
  createdAt: number;
  messageCount: number;
  lastActivity: number;
  isToolCall?: boolean;
  toolCallMethod?: string;
}

interface OperationMetrics {
  startTime: number;
  operation: string;
  messageId?: string | number;
}

interface ActiveCounters {
  sessions: number;
  toolCalls: number;
}

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const CONNECTION_TIMEOUT_MS = 30 * 1000; // 30 seconds for connection
const SEND_TIMEOUT_MS = 10 * 1000; // 10 seconds for sending messages

// Tool call methods that initiate sessions
const TOOL_CALL_METHODS = new Set([
  'tools/call',
  'tools/list',
  'tools/get',
  'prompts/list',
  'prompts/get',
  'resources/list',
  'resources/read',
  'resources/subscribe',
]);

type InstrumentedSseTransportOptions = {
  url: string;
  headers?: Record<string, string>;
  onclose?: () => void;
  onmessage?: (message: JSONRPCMessage) => void;
  onerror: ((error: unknown) => void) | ((error: Error) => void);
};

/**
 * Instrumented SSE Transport with comprehensive OpenTelemetry support.
 *
 * Supports two operational modes:
 * - WARNING: High-level metrics and error reporting
 * - DEBUG: Detailed tracing of all operations and message flows
 *
 * Key Features:
 * - Active session and tool call tracking with UpDownCounters
 * - Distributed tracing with automatic parent/child span relationships
 * - Tool call lifecycle management (initiation to completion)
 * - Trace context injection for HTTP headers
 * - Manual debugging and counter reset capabilities
 * - Timeout handling for all async operations
 * - Safe error handling that never crashes the process
 *
 * Environment Variables:
 * - MCP_OTEL_MODE: 'WARNING' (default) or 'DEBUG'
 *
 * Public Methods:
 * - getActiveCounters(): Get current session and tool call counts
 * - resetActiveCounters(): Manually reset all counters to zero
 * - getSessionDebugInfo(): Get detailed session information
 * - forceCompleteToolCall(): Manually complete stuck tool calls
 * - getEnhancedHeaders(): Get headers with trace context
 * - updateHeadersWithTraceContext(): Update existing headers with trace context
 *
 * Static Methods:
 * - injectTraceContext(): Inject trace context into headers (can be used before construction)
 */
export class InstrumentedSseTransport extends SseMCPTransport {
  #sessions = new Map<string, SpanState>();
  #onmessage?: (message: JSONRPCMessage) => void;
  #onerror: (error: unknown) => void;
  #onclose?: () => void;
  #transportSpan?: Span;
  #connectionStartTime: number = 0;
  #operationMetrics = new Map<string, OperationMetrics>();
  #isClosing = false;
  #activeCounters: ActiveCounters = { sessions: 0, toolCalls: 0 };

  constructor(opts: InstrumentedSseTransportOptions) {
    let constructorSpan: Span | undefined;

    try {
      // Start constructor instrumentation as child of current active span
      constructorSpan = tracer.startSpan('mcp.transport.constructor', {
        attributes: {
          'mcp.transport.url': opts.url,
          'mcp.transport.mode': OTEL_MODE,
          'mcp.transport.has_headers': !!opts.headers,
        },
      });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Initializing InstrumentedSseTransport', {
            data: {
              url: opts.url,
              mode: OTEL_MODE,
              headers: opts.headers ? Object.keys(opts.headers) : [],
            },
          }),
        );
      }

      // Inject trace context into headers for distributed tracing before calling super
      const enhancedHeaders = InstrumentedSseTransport.injectTraceContext(
        opts.headers || {},
      );
      super({ ...opts, headers: enhancedHeaders }); // Call the base constructor with enhanced headers

      if (!opts.onerror) {
        const error = new Error('onerror handler is required');
        constructorSpan?.recordException(error);
        constructorSpan?.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      }

      this.#onclose = opts.onclose;
      this.#onmessage = opts.onmessage;
      this.#onerror = this.#safeErrorHandler((e: unknown) => {
        if (isError(e)) {
          if (isAbortError(e)) {
            log((l) =>
              l.verbose(
                `InstrumentedSseTransport (From error handler...) aborted; isClosing=${this.#isClosing}`,
              ),
            );
          } else {
            opts.onerror(e);
          }
        } else {
          opts.onerror(new Error(String(e)));
        }
      });

      // Override base callbacks with instrumented versions
      super.onclose = this.#safeAsyncWrapper(
        'handleClose',
        this.handleClose.bind(this),
      );
      super.onerror = this.#safeAsyncWrapper(
        'handleError',
        this.handleError.bind(this),
      );
      super.onmessage = this.#safeAsyncWrapper(
        'handleMessage',
        this.handleMessage.bind(this),
      );

      // Record successful construction
      connectionCounter.add(1, {
        'mcp.transport.url': opts.url,
        'mcp.transport.operation': 'constructor',
        'mcp.transport.status': 'success',
      });

      constructorSpan?.setStatus({ code: SpanStatusCode.OK });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('InstrumentedSseTransport initialized successfully'),
        );
      }
    } catch (error) {
      /*
      if (isAbortError(error)) {
        // Suppress abort errors; this is a disconnect not a construction failure.
        const isClosing = this.#isClosing;
        log((l) =>
          l.verbose(
            `InstrumentedSseTransport construction aborted; isClosing=${isClosing}`,
          ),
        );
      }
      */
      error = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'MCP Transport Constructor',
      });
      // Record construction failure
      connectionCounter.add(1, {
        'mcp.transport.url': opts.url,
        'mcp.transport.operation': 'constructor',
        'mcp.transport.status': 'error',
      });

      errorCounter.add(1, {
        'mcp.transport.operation': 'constructor',
        'mcp.transport.error_type': isError(error) ? error.name : 'unknown',
      });

      constructorSpan?.recordException(error as Error);
      constructorSpan?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });
      log((l) =>
        l.error('Failed to initialize InstrumentedSseTransport', {
          data: { error: isError(error) ? error.message : String(error) },
        }),
      );

      throw error;
    } finally {
      constructorSpan?.end();
    }
  }

  // === Safety Wrappers ===

  /**
   * Creates a safe wrapper for error handlers that never throws
   */
  #safeErrorHandler = (handler: (error: unknown) => void) => {
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
          }),
        );
      }
    };
  };

  /**
   * Creates a safe async wrapper that catches all exceptions
   */
  #safeAsyncWrapper = <T extends unknown[], R>(
    operationName: string,
    fn: (...args: T) => R | Promise<R>,
  ) => {
    return async (...args: T): Promise<R | void> => {
      const startTime = Date.now();
      let span: Span | undefined;

      try {
        if (DEBUG_MODE) {
          // Create span as child of current active span
          span = tracer.startSpan(`mcp.transport.${operationName}`, {
            attributes: {
              'mcp.transport.operation': operationName,
              'mcp.transport.url': this.url?.toString(),
            },
          });
        }

        const result = await fn(...args);

        if (DEBUG_MODE) {
          const duration = Date.now() - startTime;
          operationDurationHistogram.record(duration, {
            'mcp.transport.operation': operationName,
            'mcp.transport.status': 'success',
          });

          span?.addEvent(`${operationName}.completed`, {
            'mcp.transport.duration_ms': duration,
          });
          span?.setStatus({ code: SpanStatusCode.OK });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Record error metrics
        errorCounter.add(1, {
          'mcp.transport.operation': operationName,
          'mcp.transport.error_type': isError(error) ? error.name : 'unknown',
        });

        operationDurationHistogram.record(duration, {
          'mcp.transport.operation': operationName,
          'mcp.transport.status': 'error',
        });

        span?.recordException(error as Error);
        span?.setStatus({
          code: SpanStatusCode.ERROR,
          message: isError(error) ? error.message : String(error),
        });

        log((l) =>
          l.error(`MCP Transport ${operationName} failed`, {
            data: {
              error: isError(error) ? error.message : String(error),
              duration,
              stack: isError(error) ? error.stack : undefined,
            },
          }),
        );

        // Convert to LoggedError and pass to error handler
        const loggedError = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: false, // Already logged above
          source: `MCP Transport ${operationName}`,
          data: { operationName, duration },
        });

        this.#onerror(loggedError);
      } finally {
        span?.end();
      }
    };
  };

  /**
   * Records operation metrics for detailed tracking
   */
  #recordOperation = (
    operation: string,
    messageId?: string | number,
  ): string => {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.#operationMetrics.set(operationId, {
      startTime: Date.now(),
      operation,
      messageId,
    });
    return operationId;
  };

  /**
   * Completes operation metrics tracking
   */
  #completeOperation = (
    operationId: string,
    status: 'success' | 'error' = 'success',
  ) => {
    const metrics = this.#operationMetrics.get(operationId);
    if (metrics) {
      const duration = Date.now() - metrics.startTime;
      operationDurationHistogram.record(duration, {
        'mcp.transport.operation': metrics.operation,
        'mcp.transport.status': status,
      });
      this.#operationMetrics.delete(operationId);

      if (DEBUG_MODE) {
        log((l) =>
          l.debug(`Operation ${metrics.operation} completed`, {
            data: { duration, status, messageId: metrics.messageId },
          }),
        );
      }
    }
  };

  // === Property Overrides ===

  override get onmessage(): ((message: JSONRPCMessage) => void) | undefined {
    return this.#onmessage;
  }

  override set onmessage(
    handler: ((message: JSONRPCMessage) => void) | undefined,
  ) {
    this.#onmessage = handler;
  }

  override get onerror(): (error: unknown) => void {
    return this.#onerror;
  }

  override set onerror(handler: (error: unknown) => void) {
    if (!handler) {
      throw new Error('onerror handler is required');
    }
    this.#onerror = this.#safeErrorHandler(handler);
  }

  override get onclose(): (() => void) | undefined {
    return this.#onclose;
  }

  override set onclose(handler: (() => void) | undefined) {
    this.#onclose = handler;
  }

  toString(): string {
    return `InstrumentedSseTransport(${this.url?.toString() || 'unknown'})`;
  }
  // === MCP Client Transport Methods ===

  override async start(): Promise<void> {
    let span: Span | undefined;
    const operationId = this.#recordOperation('start');

    try {
      this.#connectionStartTime = Date.now();

      // Create span as child of active span if one exists
      span = tracer.startSpan('mcp.transport.start', {
        attributes: {
          'mcp.transport.url': this.url?.toString(),
          'mcp.transport.mode': OTEL_MODE,
        },
      });

      this.#transportSpan = span;

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Starting MCP Client Transport', {
            data: { url: this.url?.toString(), mode: OTEL_MODE },
          }),
        );
      }

      // Record connection attempt
      connectionCounter.add(1, {
        'mcp.transport.url': this.url?.toString() || 'unknown',
        'mcp.transport.operation': 'start',
        'mcp.transport.status': 'attempt',
      });

      // Apply connection timeout
      await this.#withTimeout(
        super.start(),
        CONNECTION_TIMEOUT_MS,
        'MCP connection',
      );

      // Record successful connection
      connectionCounter.add(1, {
        'mcp.transport.url': this.url?.toString() || 'unknown',
        'mcp.transport.operation': 'start',
        'mcp.transport.status': 'success',
      });

      span.setStatus({ code: SpanStatusCode.OK });
      this.#completeOperation(operationId, 'success');

      if (DEBUG_MODE) {
        log((l) => l.debug('MCP Client Transport started successfully'));
      }
    } catch (error) {
      if (isAbortError(error)) {
        // Suppress abort errors; this is a disconnect not a construction failure.
        const isClosing = this.#isClosing;
        log((l) =>
          l.verbose(
            `InstrumentedSseTransport start() aborted; isClosing=${isClosing}`,
          ),
        );
        return;
      }
      // Record failed connection
      connectionCounter.add(1, {
        'mcp.transport.url': this.url?.toString() || 'unknown',
        'mcp.transport.operation': 'start',
        'mcp.transport.status': 'error',
      });

      errorCounter.add(1, {
        'mcp.transport.operation': 'start',
        'mcp.transport.error_type': isError(error) ? error.name : 'unknown',
      });

      span?.recordException(error as Error);
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });

      this.#completeOperation(operationId, 'error');

      log((l) =>
        l.error('Failed to start MCP Client Transport', {
          data: {
            error: isError(error) ? error.message : String(error),
            stack: isError(error) ? error.stack : undefined,
          },
        }),
      );

      throw error;
    } finally {
      // Don't end the transport span here - it should stay active for the connection duration
    }
  }

  override async close(): Promise<void> {
    let span: Span | undefined;
    const operationId = this.#recordOperation('close');

    try {
      this.#isClosing = true;

      span = tracer.startSpan('mcp.transport.close', {
        attributes: {
          'mcp.transport.url': this.url?.toString(),
          'mcp.transport.session_count': this.#sessions.size,
        },
      });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Closing MCP Client Transport', {
            data: {
              url: this.url?.toString(),
              sessionCount: this.#sessions.size,
              connectionDuration: this.#connectionStartTime
                ? Date.now() - this.#connectionStartTime
                : 0,
            },
          }),
        );
      }

      // Close all active sessions
      for (const [, sessionState] of this.#sessions.entries()) {
        const sessionDuration = Date.now() - sessionState.createdAt;
        sessionDurationHistogram.record(sessionDuration, {
          'mcp.transport.url': this.url?.toString() || 'unknown',
          'mcp.transport.session_type': 'normal_close',
        });

        sessionState.span.addEvent('session.closing', {
          'mcp.session.duration_ms': sessionDuration,
          'mcp.session.message_count': sessionState.messageCount,
        });
        sessionState.span.setStatus({ code: SpanStatusCode.OK });
        sessionState.span.end();
        clearTimeout(sessionState.idleTimer);

        // Decrement counters safely
        this.#decrementCounter('sessions');
        if (sessionState.isToolCall) {
          this.#decrementCounter('toolCalls');

          // Record tool call completion
          toolCallCompletionCounter.add(1, {
            'mcp.transport.url': this.url?.toString() || 'unknown',
            'mcp.tool.method': sessionState.toolCallMethod || 'unknown',
            'mcp.tool.completion_reason': 'transport_close',
          });
        }
      }
      this.#sessions.clear();

      await super.close();

      // End the transport span
      if (this.#transportSpan) {
        const connectionDuration = this.#connectionStartTime
          ? Date.now() - this.#connectionStartTime
          : 0;
        this.#transportSpan.addEvent('transport.closed', {
          'mcp.transport.duration_ms': connectionDuration,
        });
        this.#transportSpan.setStatus({ code: SpanStatusCode.OK });
        this.#transportSpan.end();
      }

      span.setStatus({ code: SpanStatusCode.OK });
      this.#completeOperation(operationId, 'success');

      if (DEBUG_MODE) {
        log((l) => l.debug('MCP Client Transport closed successfully'));
      }
    } catch (error) {
      errorCounter.add(1, {
        'mcp.transport.operation': 'close',
        'mcp.transport.error_type': isError(error) ? error.name : 'unknown',
      });

      span?.recordException(error as Error);
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });

      this.#completeOperation(operationId, 'error');

      log((l) =>
        l.error('Failed to close MCP Client Transport', {
          data: { error: isError(error) ? error.message : String(error) },
        }),
      );

      throw error;
    } finally {
      span?.end();
    }
  }

  override async send(message: JSONRPCMessage): Promise<void> {
    let span: Span | undefined;
    const messageId = this.#getMessageId(message);
    const messageMethod = this.#getMessageMethod(message);
    const operationId = this.#recordOperation('send', messageId);

    try {
      const messageStr = JSON.stringify(message);
      const messageSize = new TextEncoder().encode(messageStr).length;

      // Create span as child of active span if one exists
      span = tracer.startSpan('mcp.transport.send', {
        attributes: {
          'mcp.transport.url': this.url?.toString(),
          'mcp.message.id': String(messageId || 'unknown'),
          'mcp.message.method': messageMethod || 'unknown',
          'mcp.message.size_bytes': messageSize,
        },
      });

      // Check if this is a tool call and track it
      const isToolCall = messageMethod && TOOL_CALL_METHODS.has(messageMethod);

      // Create or update session for this message if it has an ID
      let sessionState: SpanState | undefined;
      if (messageId) {
        sessionState = this.#getOrCreateSession(message);

        // If this is a new session, increment session counter
        if (sessionState && sessionState.messageCount === 1) {
          this.#incrementCounter('sessions');
        }

        // If this is a tool call and session wasn't already marked as tool call
        if (sessionState && isToolCall && !sessionState.isToolCall) {
          sessionState.isToolCall = true;
          sessionState.toolCallMethod = messageMethod;
          this.#incrementCounter('toolCalls');

          toolCallCounter.add(1, {
            'mcp.transport.url': this.url?.toString() || 'unknown',
            'mcp.tool.method': messageMethod || 'unknown',
          });
        }
      }

      // Record message metrics
      messageCounter.add(1, {
        'mcp.transport.url': this.url?.toString() || 'unknown',
        'mcp.transport.direction': 'outbound',
        'mcp.message.method': messageMethod || 'unknown',
      });

      messageSizeHistogram.record(messageSize, {
        'mcp.transport.direction': 'outbound',
        'mcp.message.method': messageMethod || 'unknown',
      });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Sending MCP Client Message', {
            data: {
              messageId,
              method: messageMethod,
              size: messageSize,
              url: this.url?.toString(),
              isToolCall,
            },
          }),
        );
      }

      // Apply send timeout
      await this.#withTimeout(
        super.send(message),
        SEND_TIMEOUT_MS,
        'MCP message send',
      );

      span.setStatus({ code: SpanStatusCode.OK });
      this.#completeOperation(operationId, 'success');

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('MCP Client Message sent successfully', {
            data: { messageId, method: messageMethod },
          }),
        );
      }
    } catch (error) {
      errorCounter.add(1, {
        'mcp.transport.operation': 'send',
        'mcp.transport.error_type': isError(error) ? error.name : 'unknown',
        'mcp.message.method': messageMethod || 'unknown',
      });

      span?.recordException(error as Error);
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });

      this.#completeOperation(operationId, 'error');

      log((l) =>
        l.error('Failed to send MCP Client Message', {
          data: {
            messageId,
            method: messageMethod,
            error: isError(error) ? error.message : String(error),
          },
        }),
      );

      throw error;
    } finally {
      span?.end();
    }
  }

  // === Helper Functions ===

  /**
   * Type guard to check if message has an id property
   */
  #hasId = (
    message: JSONRPCMessage,
  ): message is JSONRPCMessage & { id: string | number } => {
    return 'id' in message && message.id !== undefined;
  };

  /**
   * Type guard to check if message has a method property
   */
  #hasMethod = (
    message: JSONRPCMessage,
  ): message is JSONRPCMessage & { method: string } => {
    return 'method' in message && typeof message.method === 'string';
  };

  /**
   * Safely gets the message ID
   */
  #getMessageId = (message: JSONRPCMessage): string | number | undefined => {
    return this.#hasId(message) ? message.id : undefined;
  };

  /**
   * Safely gets the message method
   */
  #getMessageMethod = (message: JSONRPCMessage): string | undefined => {
    return this.#hasMethod(message) ? message.method : undefined;
  };

  /**
   * Creates or updates session state for message tracking
   */
  #getOrCreateSession = (message: JSONRPCMessage): SpanState | undefined => {
    const messageId = this.#getMessageId(message);
    if (!messageId) return undefined;

    const sessionId = String(messageId);
    let sessionState = this.#sessions.get(sessionId);

    if (!sessionState) {
      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Creating new MCP session', {
            data: { sessionId, method: this.#getMessageMethod(message) },
          }),
        );
      }

      // Create session span as child of current active span
      const span = tracer.startSpan('mcp.session', {
        attributes: {
          'mcp.session.id': sessionId,
          'mcp.session.created_at': Date.now(),
          'mcp.transport.url': this.url?.toString(),
          'mcp.session.initiating_method':
            this.#getMessageMethod(message) || 'unknown',
        },
      });

      sessionState = {
        span,
        idleTimer: this.#setIdleTimer(sessionId),
        createdAt: Date.now(),
        messageCount: 0,
        lastActivity: Date.now(),
      };

      this.#sessions.set(sessionId, sessionState);
    }

    // Update activity
    sessionState.messageCount++;
    sessionState.lastActivity = Date.now();
    clearTimeout(sessionState.idleTimer);
    sessionState.idleTimer = this.#setIdleTimer(sessionId);

    return sessionState;
  };

  /**
   * Sets up idle timer for session cleanup
   */
  #setIdleTimer = (sessionId: string): ReturnType<typeof setTimeout> => {
    return setTimeout(() => {
      try {
        const sessionState = this.#sessions.get(sessionId);
        if (sessionState && !this.#isClosing) {
          const sessionDuration = Date.now() - sessionState.createdAt;

          sessionDurationHistogram.record(sessionDuration, {
            'mcp.transport.url': this.url?.toString() || 'unknown',
            'mcp.transport.session_type': 'idle_timeout',
          });

          sessionState.span.addEvent('session.idle_timeout', {
            'mcp.session.duration_ms': sessionDuration,
            'mcp.session.message_count': sessionState.messageCount,
          });
          sessionState.span.setStatus({ code: SpanStatusCode.OK });
          sessionState.span.end();

          // Decrement counters before removing session
          this.#decrementCounter('sessions');
          if (sessionState.isToolCall) {
            this.#decrementCounter('toolCalls');

            // Record tool call completion
            toolCallCompletionCounter.add(1, {
              'mcp.transport.url': this.url?.toString() || 'unknown',
              'mcp.tool.method': sessionState.toolCallMethod || 'unknown',
              'mcp.tool.completion_reason': 'idle_timeout',
            });
          }

          this.#sessions.delete(sessionId);

          if (DEBUG_MODE) {
            log((l) =>
              l.debug('Session idle timeout', {
                data: {
                  sessionId,
                  duration: sessionDuration,
                  messageCount: sessionState.messageCount,
                },
              }),
            );
          }
        }
      } catch (error) {
        log((l) =>
          l.error('Error in session idle timer', {
            data: {
              sessionId,
              error: isError(error) ? error.message : String(error),
            },
          }),
        );
      }
    }, IDLE_TIMEOUT_MS);
  };

  /**
   * Gets the current count of active sessions and tool calls
   */
  getActiveCounters(): { sessions: number; toolCalls: number } {
    return { ...this.#activeCounters };
  }

  /**
   * Manually resets all active counters to zero
   * Use this when you suspect counters are out of sync due to errors
   */
  resetActiveCounters(): void {
    if (DEBUG_MODE) {
      log((l) =>
        l.debug('Manually resetting active counters', {
          data: {
            previousSessions: this.#activeCounters.sessions,
            previousToolCalls: this.#activeCounters.toolCalls,
          },
        }),
      );
    }

    // Update metrics to reflect the reset
    activeSessionsGauge.add(-this.#activeCounters.sessions);
    activeToolCallsGauge.add(-this.#activeCounters.toolCalls);

    this.#activeCounters = { sessions: 0, toolCalls: 0 };

    log((l) => l.warn('Active counters have been manually reset to zero'));
  }

  /**
   * Gets current session information for debugging
   */
  getSessionDebugInfo(): Array<{
    sessionId: string;
    messageCount: number;
    duration: number;
    isToolCall: boolean;
    toolCallMethod?: string;
    lastActivity: number;
  }> {
    const now = Date.now();
    return Array.from(this.#sessions.entries()).map(([sessionId, state]) => ({
      sessionId,
      messageCount: state.messageCount,
      duration: now - state.createdAt,
      isToolCall: !!state.isToolCall,
      toolCallMethod: state.toolCallMethod,
      lastActivity: now - state.lastActivity,
    }));
  }

  /**
   * Manually completes a stuck tool call session
   * Use this when a tool call seems to be hanging
   */
  forceCompleteToolCall(
    sessionId: string,
    reason: string = 'manual_completion',
  ): boolean {
    const sessionState = this.#sessions.get(sessionId);
    if (!sessionState || !sessionState.isToolCall) {
      return false;
    }

    const sessionDuration = Date.now() - sessionState.createdAt;

    sessionState.span.addEvent('tool.call.force_completed', {
      'mcp.session.duration_ms': sessionDuration,
      'mcp.session.message_count': sessionState.messageCount,
      'mcp.tool.completion_reason': reason,
    });

    sessionState.span.setStatus({ code: SpanStatusCode.OK });
    sessionState.span.end();
    clearTimeout(sessionState.idleTimer);

    // Decrement counters
    this.#decrementCounter('sessions');
    this.#decrementCounter('toolCalls');

    // Record tool call completion
    toolCallCompletionCounter.add(1, {
      'mcp.transport.url': this.url?.toString() || 'unknown',
      'mcp.tool.method': sessionState.toolCallMethod || 'unknown',
      'mcp.tool.completion_reason': reason,
    });

    this.#sessions.delete(sessionId);

    log((l) =>
      l.warn('Tool call manually completed', {
        data: {
          sessionId,
          duration: sessionDuration,
          reason,
          method: sessionState.toolCallMethod,
        },
      }),
    );

    return true;
  }

  /**
   * Gets enhanced headers with trace context for HTTP requests
   * This method can be used by callers to get headers with trace context included
   */
  getEnhancedHeaders(
    baseHeaders: Record<string, string> = {},
  ): Record<string, string> {
    return this.#injectTraceContext(baseHeaders);
  }

  /**
   * Updates existing headers object with trace context in place
   * Returns true if trace context was injected, false otherwise
   */
  updateHeadersWithTraceContext(headers: Record<string, string>): boolean {
    const originalKeyCount = Object.keys(headers).length;
    const enhancedHeaders = this.#injectTraceContext(headers);

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
   * Instance method to inject trace context into HTTP headers for distributed tracing
   */
  #injectTraceContext = (
    headers: Record<string, string> = {},
  ): Record<string, string> => {
    return InstrumentedSseTransport.injectTraceContext(headers);
  };

  /**
   * Creates a timeout wrapper for async operations
   */
  #withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          const error = new Error(
            `${operation} timed out after ${timeoutMs}ms`,
          );
          error.name = 'TimeoutError';
          reject(error);
        }, timeoutMs);
      }),
    ]);
  };

  /**
   * Safely increments active counters
   */
  #incrementCounter = (
    type: 'sessions' | 'toolCalls',
    amount: number = 1,
  ): void => {
    this.#activeCounters[type] = Math.max(
      0,
      this.#activeCounters[type] + amount,
    );

    if (type === 'sessions') {
      activeSessionsGauge.add(amount);
    } else {
      activeToolCallsGauge.add(amount);
    }

    if (DEBUG_MODE) {
      log((l) =>
        l.debug(`Incremented ${type} counter`, {
          data: { amount, newValue: this.#activeCounters[type] },
        }),
      );
    }
  };

  /**
   * Safely decrements active counters (never goes below 0)
   */
  #decrementCounter = (
    type: 'sessions' | 'toolCalls',
    amount: number = 1,
  ): void => {
    const oldValue = this.#activeCounters[type];
    this.#activeCounters[type] = Math.max(
      0,
      this.#activeCounters[type] - amount,
    );
    const actualDecrement = oldValue - this.#activeCounters[type];

    if (type === 'sessions') {
      activeSessionsGauge.add(-actualDecrement);
    } else {
      activeToolCallsGauge.add(-actualDecrement);
    }

    if (DEBUG_MODE) {
      log((l) =>
        l.debug(`Decremented ${type} counter`, {
          data: {
            requestedAmount: amount,
            actualAmount: actualDecrement,
            newValue: this.#activeCounters[type],
          },
        }),
      );
    }
  };

  private handleClose() {
    log((l) => l.verbose('MCP Client Transport Closed'));
    try {
      this.#onclose?.(); // pass through to client
    } catch (e) {
      log((l) => l.error('Error handling MCP Client Transport close:', e));
    }
  }

  private handleMessage(message: JSONRPCMessage) {
    log((l) => l.verbose('MCP Client Transport Message Received:', message));

    try {
      // Check if this is a response to a tool call and handle completion
      const messageId = this.#getMessageId(message);
      if (messageId) {
        const sessionId = String(messageId);
        const sessionState = this.#sessions.get(sessionId);

        // If this is a response (has result or error) and the session was a tool call
        if (
          sessionState &&
          sessionState.isToolCall &&
          ('result' in message || 'error' in message)
        ) {
          const sessionDuration = Date.now() - sessionState.createdAt;

          sessionDurationHistogram.record(sessionDuration, {
            'mcp.transport.url': this.url?.toString() || 'unknown',
            'mcp.transport.session_type': 'tool_call_response',
          });

          sessionState.span.addEvent('tool.call.completed', {
            'mcp.session.duration_ms': sessionDuration,
            'mcp.session.message_count': sessionState.messageCount,
            'mcp.tool.success': !('error' in message),
          });

          sessionState.span.setStatus({ code: SpanStatusCode.OK });
          sessionState.span.end();
          clearTimeout(sessionState.idleTimer);

          // Decrement counters
          this.#decrementCounter('sessions');
          this.#decrementCounter('toolCalls');

          // Record tool call completion
          toolCallCompletionCounter.add(1, {
            'mcp.transport.url': this.url?.toString() || 'unknown',
            'mcp.tool.method': sessionState.toolCallMethod || 'unknown',
            'mcp.tool.completion_reason':
              'error' in message ? 'error' : 'success',
          });

          this.#sessions.delete(sessionId);

          if (DEBUG_MODE) {
            log((l) =>
              l.debug('Tool call completed', {
                data: {
                  sessionId,
                  duration: sessionDuration,
                  success: !('error' in message),
                  method: sessionState.toolCallMethod,
                },
              }),
            );
          }
        }
      }

      this.#onmessage?.(message); // pass through to client
    } catch (e) {
      log((l) => l.error('Error handling MCP Client Transport message:', e));
    }
  }

  private handleError(error: unknown) {
    const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'MCP Client Transport',
      data: {
        details: 'Error occurred in MCP Client Transport',
      },
    });
    try {
      this.#onerror(le); // pass through to client
    } catch (e) {
      log((l) => l.error('Error handling MCP Client Transport error:', e));
    }
  }
}

/**
 * TransportPlugin interface for MCP Client Transport plugins
 */
export interface TransportPlugin {
  onMessage?(message: JSONRPCMessage): void;
  onError?(error: Error): void;
  onClose?(): void;
}

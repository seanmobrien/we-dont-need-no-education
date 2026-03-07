/**
 * @fileoverview Refactored Instrumented SSE MCP Transport Client
 *
 * This is a refactored version of the original InstrumentedSseTransport that
 * delegates specific concerns to dedicated modules while maintaining the
 * same external interface and functionality.
 */

import { Span, SpanStatusCode } from '@opentelemetry/api';
import { SseMCPTransport } from '../ai.sdk';
import type { JSONRPCMessage } from '../ai.sdk';

import { isError, isAbortError, LoggedError, log } from '@compliance-theater/logger';

// Import refactored modules
import { tracer, MetricsRecorder, DEBUG_MODE } from './metrics/otel-metrics';
import { CounterManager } from './metrics/counter-manager';
import { SessionManager } from './session/session-manager';
import { TraceContextManager } from './tracing/trace-context';
import { SafeOperation } from '@compliance-theater/logger/safe-operation';
import { MessageProcessor } from './message/message-processor';
import { ImpersonationService } from '@compliance-theater/auth/lib/impersonation/index';

type InstrumentedSseTransportOptions = {
  url: string;
  headers?: () => Promise<Record<string, string>>;
  onclose?: () => void;
  onmessage?: (message: JSONRPCMessage) => void;
  onerror: ((error: unknown) => void) | ((error: Error) => void);
};

/**
 * Instrumented SSE Transport with comprehensive OpenTelemetry support.
 *
 * This refactored version maintains the same external interface while delegating
 * specific concerns to specialized modules:
 * - MetricsRecorder: OpenTelemetry metrics recording
 * - CounterManager: Active session and tool call tracking
 * - SessionManager: Session lifecycle and timeout management
 * - TraceContextManager: Distributed tracing support
 * - SafeOperation: Error handling and timeout utilities
 * - MessageProcessor: Message parsing and tool call detection
 *
 * All original functionality is preserved with improved maintainability.
 */
export class InstrumentedSseTransport extends SseMCPTransport {
  // Module dependencies
  #counterManager: CounterManager;
  #sessionManager: SessionManager;
  #safetyUtils: SafeOperation;
  #messageProcessor: MessageProcessor;
  #impersonation?: ImpersonationService;
  // Core transport state
  #onmessage?: (message: JSONRPCMessage) => void;
  #onerror: (error: unknown) => void;
  #onclose?: () => void;
  #transportSpan?: Span;
  #connectionStartTime: number = 0;
  #isClosing = false;
  #heartbeatTimer?: ReturnType<typeof setInterval>;
  #inactivityTimer?: ReturnType<typeof setTimeout>;
  #lastActivity: number = Date.now();
  #closed = false;
  #getHeaders: () => Promise<Record<string, string>>;

  // Heartbeat / inactivity constants (tunable)
  static readonly HEARTBEAT_INTERVAL_MS = 15_000; // send watchdog ping / check every 15s
  static readonly INACTIVITY_TIMEOUT_MS = 60_000 * 60 * 2; // if no inbound activity for 2 hours -> close
  static readonly POST_ERROR_AUTOCLOSE_DELAY_MS = 2_000; // grace period before forced close after fatal error

  constructor({
    // impersonation,
    headers: getHeaders,
    ...opts
  }: InstrumentedSseTransportOptions) {
    let constructorSpan: Span | undefined;
    try {
      // Start constructor instrumentation as child of current active span
      constructorSpan = tracer.startSpan('mcp.transport.constructor', {
        attributes: {
          'mcp.transport.url': opts.url,
          'mcp.transport.mode': DEBUG_MODE ? 'DEBUG' : 'WARNING',
          'mcp.transport.has_headers': !!getHeaders,
        },
      });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Initializing InstrumentedSseTransport', {
            data: {
              url: opts.url,
              mode: DEBUG_MODE ? 'DEBUG' : 'WARNING',
            },
          })
        );
      }

      // Inject trace context into headers for distributed tracing before calling super
      const headers = TraceContextManager.injectTraceContext({});
      super({ ...opts, headers }); // Call the base constructor with enhanced headers
      // Capture impersonation service if provided
      // this.#impersonation = impersonation;
      this.#getHeaders = getHeaders || (() => Promise.resolve({}));
      if (!opts.onerror) {
        const error = new Error('onerror handler is required');
        constructorSpan?.recordException(error);
        constructorSpan?.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      }

      // Initialize module dependencies
      this.#safetyUtils = new SafeOperation(opts.url);
      this.#counterManager = new CounterManager();
      this.#sessionManager = new SessionManager(opts.url, this.#counterManager);
      this.#messageProcessor = new MessageProcessor(
        opts.url,
        this.#sessionManager,
        this.#counterManager
      );

      // Set up event handlers
      this.#onclose = opts.onclose;
      this.#onmessage = opts.onmessage;
      this.#onerror = this.#safetyUtils.createSafeErrorHandler((e: unknown) => {
        opts.onerror(
          LoggedError.isTurtlesAllTheWayDownBaby(e, {
            log: true,
            message: 'MCP SSE Transport: Error occurred',
          })
        );
      });

      // Override base callbacks with instrumented versions
      super.onclose = this.#safetyUtils.createSafeAsyncWrapper(
        'handleClose',
        this.handleClose.bind(this),
        this.#onerror
      );
      super.onerror = this.#safetyUtils.createSafeAsyncWrapper(
        'handleError',
        this.handleError.bind(this),
        this.#onerror
      );
      super.onmessage = this.#safetyUtils.createSafeAsyncWrapper(
        'handleMessage',
        this.handleMessage.bind(this),
        this.#onerror
      );

      // Record successful construction
      MetricsRecorder.recordConnection(opts.url, 'constructor', 'success');

      constructorSpan?.setStatus({ code: SpanStatusCode.OK });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('InstrumentedSseTransport initialized successfully')
        );
      }
    } catch (error) {
      // Record construction failure
      MetricsRecorder.recordConnection(opts.url, 'constructor', 'error');
      MetricsRecorder.recordError(
        'constructor',
        isError(error) ? error.name : 'unknown'
      );

      constructorSpan?.recordException(error as Error);
      constructorSpan?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });

      log((l) =>
        l.error('Failed to initialize InstrumentedSseTransport', {
          data: { error: isError(error) ? error.message : String(error) },
        })
      );

      throw error;
    } finally {
      constructorSpan?.end();
    }
  }

  // === Property Overrides ===

  override get onmessage(): ((message: JSONRPCMessage) => void) | undefined {
    return this.#onmessage;
  }

  override set onmessage(
    handler: ((message: JSONRPCMessage) => void) | undefined
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
    this.#onerror = this.#safetyUtils.createSafeErrorHandler(handler);
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
    const operationId = this.#safetyUtils.recordOperation('start');

    try {
      this.#connectionStartTime = Date.now();

      // Create span as child of active span if one exists
      span = tracer.startSpan('mcp.transport.start', {
        attributes: {
          'mcp.transport.url': this.url?.toString(),
          'mcp.transport.mode': DEBUG_MODE ? 'DEBUG' : 'WARNING',
        },
      });

      this.#transportSpan = span;

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Starting MCP Client Transport', {
            data: {
              url: this.url?.toString(),
              mode: DEBUG_MODE ? 'DEBUG' : 'WARNING',
            },
          })
        );
      }

      // Record connection attempt
      MetricsRecorder.recordConnection(
        this.url?.toString() || 'unknown',
        'start',
        'attempt'
      );

      // Timeout capabilities now built into our fetch implementation
      await super.start();

      // Record successful connection
      MetricsRecorder.recordConnection(
        this.url?.toString() || 'unknown',
        'start',
        'success'
      );

      // Initialize heartbeat & inactivity watchdog AFTER successful start
      this.#initializeConnectionWatchdogs();

      span.setStatus({ code: SpanStatusCode.OK });
      this.#safetyUtils.completeOperation(operationId, 'success');

      if (DEBUG_MODE) {
        log((l) => l.debug('MCP Client Transport started successfully'));
      }
    } catch (error) {
      if (isAbortError(error)) {
        // Suppress abort errors; this is a disconnect not a construction failure.
        const isClosing = this.#isClosing;
        log((l) =>
          l.verbose(
            `InstrumentedTransport::MCP Client Transport start() aborted; isClosing=${isClosing}`
          )
        );
        return;
      }

      // Record failed connection
      MetricsRecorder.recordConnection(
        this.url?.toString() || 'unknown',
        'start',
        'error'
      );
      MetricsRecorder.recordError(
        'start',
        isError(error) ? error.name : 'unknown'
      );

      span?.recordException(error as Error);
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });

      this.#safetyUtils.completeOperation(operationId, 'error');
      log((l) =>
        l.error('Failed to start MCP Client Transport', {
          data: {
            error: isError(error) ? error.message : String(error),
            stack: isError(error) ? error.stack : undefined,
          },
        })
      );

      throw error;
    } finally {
      // Don't end the transport span here - it should stay active for the connection duration
    }
  }

  protected override async resolveHeaders(): Promise<Headers> {
    const ret = await super.resolveHeaders();
    const dynamicHeaders = await this.#getHeaders();
    Object.entries(dynamicHeaders).forEach(([key, value]) => {
      ret.set(key, value);
    });
    // If impersonation service is provided, add impersonation headers
    if (this.#impersonation) {
      const token = await this.#impersonation.getImpersonatedToken();
      if (token) {
        ret.set('Authorization', `Bearer ${token}`);
      }
    }
    return ret;
  }

  override async close(): Promise<void> {
    let span: Span | undefined;
    const operationId = this.#safetyUtils.recordOperation('close');

    try {
      this.#isClosing = true;

      span = tracer.startSpan('mcp.transport.close', {
        attributes: {
          'mcp.transport.url': this.url?.toString(),
          'mcp.transport.session_count': this.#sessionManager.sessionCount,
        },
      });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Closing MCP Client Transport', {
            data: {
              url: this.url?.toString(),
              sessionCount: this.#sessionManager.sessionCount,
              connectionDuration: this.#connectionStartTime
                ? Date.now() - this.#connectionStartTime
                : 0,
            },
          })
        );
      }

      // Close all active sessions
      this.#sessionManager.closeAllSessions();

      // Stop timers early to avoid late firing while awaiting super.close()
      this.#clearWatchdogs();

      try {
        await super.close();
      } catch (e) {
        // Swallow AbortError that can arise from closing streams mid-flight
        if (isAbortError(e)) {
          log((l) =>
            l.verbose(
              'InstrumentedSseTransport.close: Ignoring AbortError during close()'
            )
          );
        } else {
          throw e;
        }
      }

      // End the transport span
      if (this.#transportSpan) {
        try {
          const connectionDuration = this.#connectionStartTime
            ? Date.now() - this.#connectionStartTime
            : 0;
          this.#transportSpan.addEvent('transport.closed', {
            'mcp.transport.duration_ms': connectionDuration,
          });
          this.#transportSpan.setStatus({ code: SpanStatusCode.OK });
          this.#transportSpan.end();
        } catch (e) {
          LoggedError.isTurtlesAllTheWayDownBaby(e, {
            log: true,
          });
        }
      }

      span.setStatus({ code: SpanStatusCode.OK });
      this.#safetyUtils.completeOperation(operationId, 'success');

      this.#closed = true;

      if (DEBUG_MODE) {
        log((l) => l.debug('MCP Client Transport closed successfully'));
      }
    } catch (error) {
      MetricsRecorder.recordError(
        'close',
        isError(error) ? error.name : 'unknown'
      );

      span?.recordException(error as Error);
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });

      this.#safetyUtils.completeOperation(operationId, 'error');

      log((l) =>
        l.error('Failed to close MCP Client Transport', {
          data: { error: isError(error) ? error.message : String(error) },
        })
      );
      // throw error;
    } finally {
      span?.end();
    }
  }

  override async send(message: JSONRPCMessage): Promise<void> {
    let span: Span | undefined;
    const messageId = this.#sessionManager.getMessageId(message);
    const messageMethod = this.#sessionManager.getMessageMethod(message);
    const operationId = this.#safetyUtils.recordOperation('send', messageId);

    try {
      // Create span as child of active span if one exists
      span = tracer.startSpan('mcp.transport.send', {
        attributes: {
          'mcp.transport.url': this.url?.toString(),
          'mcp.message.id': String(messageId || 'unknown'),
          'mcp.message.method': messageMethod || 'unknown',
        },
      });

      // Process the outbound message
      this.#messageProcessor.processOutboundMessage(message);

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Sending MCP Client Message', {
            data: {
              messageId,
              method: messageMethod,
              url: this.url?.toString(),
            },
          })
        );
      }

      await super.send(message);

      span.setStatus({ code: SpanStatusCode.OK });
      this.#safetyUtils.completeOperation(operationId, 'success');

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('MCP Client Message sent successfully', {
            data: { messageId, method: messageMethod },
          })
        );
      }
    } catch (error) {
      MetricsRecorder.recordError(
        'send',
        isError(error) ? error.name : 'unknown'
      );

      span?.recordException(error as Error);
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });

      this.#safetyUtils.completeOperation(operationId, 'error');

      log((l) =>
        l.error('Failed to send MCP Client Message', {
          data: {
            messageId,
            method: messageMethod,
            error: isError(error) ? error.message : String(error),
          },
        })
      );

      throw error;
    } finally {
      span?.end();
    }
  }

  // === Public API Methods (Delegated to modules) ===

  /**
   * Gets the current count of active sessions and tool calls
   */
  getActiveCounters(): { sessions: number; toolCalls: number } {
    return this.#counterManager.getActiveCounters();
  }

  /**
   * Manually resets all active counters to zero
   */
  resetActiveCounters(): void {
    this.#counterManager.resetActiveCounters();
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
    return this.#sessionManager.getSessionDebugInfo();
  }

  /**
   * Manually completes a stuck tool call session
   */
  forceCompleteToolCall(
    sessionId: string,
    reason: string = 'manual_completion'
  ): boolean {
    return this.#sessionManager.forceCompleteToolCall(sessionId, reason);
  }

  /**
   * Gets enhanced headers with trace context for HTTP requests
   */
  getEnhancedHeaders(
    baseHeaders: Record<string, string> = {}
  ): Record<string, string> {
    return TraceContextManager.getEnhancedHeaders(baseHeaders);
  }

  /**
   * Updates existing headers object with trace context in place
   */
  updateHeadersWithTraceContext(headers: Record<string, string>): boolean {
    return TraceContextManager.updateHeadersWithTraceContext(headers);
  }

  /**
   * Static method to inject trace context into HTTP headers for distributed tracing
   */
  static injectTraceContext(
    headers: Record<string, string> = {}
  ): Record<string, string> {
    return TraceContextManager.injectTraceContext(headers);
  }

  // === Event Handlers ===

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
      // Process the inbound message
      this.#messageProcessor.processInboundMessage(message);

      // Update activity time for watchdog
      this.#lastActivity = Date.now();

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

    // If we are not already closing, schedule an automatic close to prevent
    // lingering hung transports after an unrecoverable error. Abort errors
    // are treated as graceful shutdowns upstream, so only close on non-abort.
    if (!this.#isClosing && !isAbortError(error)) {
      this.#schedulePostErrorAutoclose();
    }
  }

  // === Heartbeat & Watchdog Management ===

  /**
   * Initialize heartbeat interval and inactivity timeout watchdog.
   * These guard against silent hung connections where the underlying SSE
   * stream remains open but no messages are received (e.g., network middlebox
   * buffering or server-side stall).
   */
  #initializeConnectionWatchdogs(): void {
    this.#lastActivity = Date.now();
    this.#clearWatchdogs();

    // Heartbeat interval: record metric + (optionally) emit trace event.
    this.#heartbeatTimer = setInterval(() => {
      // Only act if not closing/closed
      if (this.#isClosing || this.#closed) return;
      const now = Date.now();
      MetricsRecorder.recordConnection(
        this.url?.toString() || 'unknown',
        'heartbeat',
        'success'
      );
      // Inactivity check piggybacked here (alternative to separate timeout reset)
      if (
        now - this.#lastActivity >
        InstrumentedSseTransport.INACTIVITY_TIMEOUT_MS
      ) {
        log((l) =>
          l.warn(
            'MCP Client Transport inactivity threshold exceeded; initiating graceful close',
            {
              url: this.url?.toString(),
              idleMs: now - this.#lastActivity,
              threshold: InstrumentedSseTransport.INACTIVITY_TIMEOUT_MS,
            }
          )
        );
        this.close().catch((err) =>
          log((l) =>
            l.error('Error while closing after inactivity watchdog', {
              error: isError(err) ? err.message : String(err),
            })
          )
        );
      }
    }, InstrumentedSseTransport.HEARTBEAT_INTERVAL_MS);
  }

  /** Clear heartbeat and inactivity timers. */
  #clearWatchdogs(): void {
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer);
      this.#heartbeatTimer = undefined;
    }
    if (this.#inactivityTimer) {
      clearTimeout(this.#inactivityTimer);
      this.#inactivityTimer = undefined;
    }
  }

  /** Schedule forced close after fatal error to prevent resource leaks. */
  #schedulePostErrorAutoclose(): void {
    // Avoid multiple schedules
    if (this.#inactivityTimer || this.#isClosing || this.#closed) return;
    this.#inactivityTimer = setTimeout(() => {
      if (this.#isClosing || this.#closed) return;
      log((l) =>
        l.warn('Auto-closing MCP Client Transport after error grace period', {
          url: this.url?.toString(),
          delayMs: InstrumentedSseTransport.POST_ERROR_AUTOCLOSE_DELAY_MS,
        })
      );
      this.close().catch((err) =>
        log((l) =>
          l.error('Error during post-error autoclose', {
            error: isError(err) ? err.message : String(err),
          })
        )
      );
    }, InstrumentedSseTransport.POST_ERROR_AUTOCLOSE_DELAY_MS);
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

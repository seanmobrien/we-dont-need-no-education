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

import { LoggedError, isError } from '@/lib/react-util';
import { log } from '@/lib/logger';

// Import refactored modules
import { tracer, MetricsRecorder, DEBUG_MODE } from './metrics/otel-metrics';
import { CounterManager } from './metrics/counter-manager';
import { SessionManager } from './session/session-manager';
import { TraceContextManager } from './tracing/trace-context';
import { SafetyUtils, CONNECTION_TIMEOUT_MS, SEND_TIMEOUT_MS } from './utils/safety-utils';
import { MessageProcessor } from './message/message-processor';

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
 * This refactored version maintains the same external interface while delegating
 * specific concerns to specialized modules:
 * - MetricsRecorder: OpenTelemetry metrics recording
 * - CounterManager: Active session and tool call tracking  
 * - SessionManager: Session lifecycle and timeout management
 * - TraceContextManager: Distributed tracing support
 * - SafetyUtils: Error handling and timeout utilities
 * - MessageProcessor: Message parsing and tool call detection
 *
 * All original functionality is preserved with improved maintainability.
 */
export class InstrumentedSseTransport extends SseMCPTransport {
  // Module dependencies
  #counterManager: CounterManager;
  #sessionManager: SessionManager;
  #safetyUtils: SafetyUtils;
  #messageProcessor: MessageProcessor;

  // Core transport state
  #onmessage?: (message: JSONRPCMessage) => void;
  #onerror: (error: unknown) => void;
  #onclose?: () => void;
  #transportSpan?: Span;
  #connectionStartTime: number = 0;
  #isClosing = false;

  constructor(opts: InstrumentedSseTransportOptions) {
    let constructorSpan: Span | undefined;

    try {
      // Start constructor instrumentation as child of current active span
      constructorSpan = tracer.startSpan('mcp.transport.constructor', {
        attributes: {
          'mcp.transport.url': opts.url,
          'mcp.transport.mode': DEBUG_MODE ? 'DEBUG' : 'WARNING',
          'mcp.transport.has_headers': !!opts.headers,
        },
      });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('Initializing InstrumentedSseTransport', {
            data: {
              url: opts.url,
              mode: DEBUG_MODE ? 'DEBUG' : 'WARNING',
              headers: opts.headers ? Object.keys(opts.headers) : [],
            },
          }),
        );
      }

      // Inject trace context into headers for distributed tracing before calling super
      const enhancedHeaders = TraceContextManager.injectTraceContext(
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

      // Initialize module dependencies
      this.#counterManager = new CounterManager();
      this.#sessionManager = new SessionManager(opts.url, this.#counterManager);
      this.#safetyUtils = new SafetyUtils(opts.url);
      this.#messageProcessor = new MessageProcessor(opts.url, this.#sessionManager, this.#counterManager);

      // Set up event handlers
      this.#onclose = opts.onclose;
      this.#onmessage = opts.onmessage;
      this.#onerror = this.#safetyUtils.createSafeErrorHandler((e: unknown) => {
        if (isError(e)) {
          opts.onerror(e);
        } else {
          opts.onerror(new Error(String(e)));
        }
      });

      // Override base callbacks with instrumented versions
      super.onclose = this.#safetyUtils.createSafeAsyncWrapper(
        'handleClose',
        this.handleClose.bind(this),
        this.#onerror,
      );
      super.onerror = this.#safetyUtils.createSafeAsyncWrapper(
        'handleError',
        this.handleError.bind(this),
        this.#onerror,
      );
      super.onmessage = this.#safetyUtils.createSafeAsyncWrapper(
        'handleMessage',
        this.handleMessage.bind(this),
        this.#onerror,
      );

      // Record successful construction
      MetricsRecorder.recordConnection(opts.url, 'constructor', 'success');

      constructorSpan?.setStatus({ code: SpanStatusCode.OK });

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('InstrumentedSseTransport initialized successfully'),
        );
      }
    } catch (error) {
      // Record construction failure
      MetricsRecorder.recordConnection(opts.url, 'constructor', 'error');
      MetricsRecorder.recordError('constructor', isError(error) ? error.name : 'unknown');

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
            data: { url: this.url?.toString(), mode: DEBUG_MODE ? 'DEBUG' : 'WARNING' },
          }),
        );
      }

      // Record connection attempt
      MetricsRecorder.recordConnection(this.url?.toString() || 'unknown', 'start', 'attempt');

      // Apply connection timeout
      await this.#safetyUtils.withTimeout(
        super.start(),
        CONNECTION_TIMEOUT_MS,
        'MCP connection',
      );

      // Record successful connection
      MetricsRecorder.recordConnection(this.url?.toString() || 'unknown', 'start', 'success');

      span.setStatus({ code: SpanStatusCode.OK });
      this.#safetyUtils.completeOperation(operationId, 'success');

      if (DEBUG_MODE) {
        log((l) => l.debug('MCP Client Transport started successfully'));
      }
    } catch (error) {
      // Record failed connection
      MetricsRecorder.recordConnection(this.url?.toString() || 'unknown', 'start', 'error');
      MetricsRecorder.recordError('start', isError(error) ? error.name : 'unknown');

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
        }),
      );

      throw error;
    } finally {
      // Don't end the transport span here - it should stay active for the connection duration
    }
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
          }),
        );
      }

      // Close all active sessions
      this.#sessionManager.closeAllSessions();

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
      this.#safetyUtils.completeOperation(operationId, 'success');

      if (DEBUG_MODE) {
        log((l) => l.debug('MCP Client Transport closed successfully'));
      }
    } catch (error) {
      MetricsRecorder.recordError('close', isError(error) ? error.name : 'unknown');

      span?.recordException(error as Error);
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: isError(error) ? error.message : String(error),
      });

      this.#safetyUtils.completeOperation(operationId, 'error');

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
          }),
        );
      }

      // Apply send timeout
      await this.#safetyUtils.withTimeout(
        super.send(message),
        SEND_TIMEOUT_MS,
        'MCP message send',
      );

      span.setStatus({ code: SpanStatusCode.OK });
      this.#safetyUtils.completeOperation(operationId, 'success');

      if (DEBUG_MODE) {
        log((l) =>
          l.debug('MCP Client Message sent successfully', {
            data: { messageId, method: messageMethod },
          }),
        );
      }
    } catch (error) {
      MetricsRecorder.recordError('send', isError(error) ? error.name : 'unknown');

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
        }),
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
    reason: string = 'manual_completion',
  ): boolean {
    return this.#sessionManager.forceCompleteToolCall(sessionId, reason);
  }

  /**
   * Gets enhanced headers with trace context for HTTP requests
   */
  getEnhancedHeaders(
    baseHeaders: Record<string, string> = {},
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
    headers: Record<string, string> = {},
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

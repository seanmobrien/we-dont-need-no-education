import type { JSONRPCMessage } from '../ai.sdk/json-rpc-message';
import type { Span } from '@opentelemetry/api';

/** 
 * Ambient module declarations for the instrumented SSE transport package.
 *
 * These declarations provide rich JSDoc and editor experience while keeping
 * the runtime implementation in `.ts` files. Consumers can import from the
 * `@/lib/ai/mcp/instrumented-sse-transport` module or its submodules.
 */

declare module '@/lib/ai/mcp/instrumented-sse-transport/metrics/otel-metrics' {
  /** Operational mode string: 'WARNING' | 'DEBUG' */
  export const OTEL_MODE: string;

  /** True when running in debug mode */
  export const DEBUG_MODE: boolean;

  /** Tracer instance (OpenTelemetry) — declared opaque for consumers */
  export const tracer: unknown;

  /** Meter instance (OpenTelemetry) — declared opaque for consumers */
  export const meter: unknown;

  /** Lightweight helper/recorder exported for diagnostics */
  export class MetricsRecorder {
    constructor(name?: string);
    record(...args: unknown[]): void;
  }
}

declare module '@/lib/ai/mcp/instrumented-sse-transport/metrics/counter-manager' {
  /** Active counters snapshot */
  export type ActiveCounters = {
    activeSessions: number;
    activeToolCalls: number;
  };

  /** Manages and exposes counters used by the instrumented transport */
  export class CounterManager {
    constructor();
    getActiveCounters(): ActiveCounters;
    reset(): void;
    incrementSessions(delta?: number): void;
    incrementToolCalls(delta?: number): void;
  }
}

declare module '@/lib/ai/mcp/instrumented-sse-transport/session/session-manager' {

  /** Internal span/session state exposed for debugging */
  export type SpanState = {
    span: Span | unknown;
    createdAt: number;
    lastActivity: number;
    messageCount: number;
    isToolCall?: boolean;
    toolCallMethod?: string;
  };

  /** Session manager that tracks active sessions and their span state. */
  export class SessionManager {
    constructor();
    getAllSessions(): SpanState[];
    getSession(id: string): SpanState | undefined;
    endSession(id: string): void;
  }
}

declare module '@/lib/ai/mcp/instrumented-sse-transport/tracing/trace-context' {
  /**
   * Trace context utilities used to inject/extract trace headers for HTTP calls.
   * The concrete implementation uses OpenTelemetry APIs.
   */
  export class TraceContextManager {
    /** Inject trace context into headers (returns mutated headers) */
    inject(headers: Record<string, string>): Record<string, string>;

    /** Extract trace context from incoming headers (returns opaque context) */
    extract(headers: Record<string, string>): unknown;
  }
}


declare module '@/lib/ai/mcp/instrumented-sse-transport/message/message-processor' {

  /** MessageProcessor encapsulates processing of incoming JSON-RPC messages */
  export class MessageProcessor {
    constructor();
    process(message: JSONRPCMessage): Promise<void>;
  }
}

declare module '@/lib/ai/mcp/instrumented-sse-transport' {
  /** Operational mode string: 'WARNING' | 'DEBUG' */
  export const OTEL_MODE: string;

  /** True when running in debug mode */
  export const DEBUG_MODE: boolean;

  /** Tracer instance (OpenTelemetry) — declared opaque for consumers */
  export const tracer: unknown;

  /** Meter instance (OpenTelemetry) — declared opaque for consumers */
  export const meter: unknown;

  /** Lightweight helper/recorder exported for diagnostics */
  export class MetricsRecorder {
    constructor(name?: string);
    record(...args: unknown[]): void;
  }
  /** Active counters snapshot */
  export type ActiveCounters = {
    activeSessions: number;
    activeToolCalls: number;
  };

  /** Manages and exposes counters used by the instrumented transport */
  export class CounterManager {
    constructor();
    getActiveCounters(): ActiveCounters;
    reset(): void;
    incrementSessions(delta?: number): void;
    incrementToolCalls(delta?: number): void;
  }
  /** Internal span/session state exposed for debugging */
  export type SpanState = {
    span: Span | unknown;
    createdAt: number;
    lastActivity: number;
    messageCount: number;
    isToolCall?: boolean;
    toolCallMethod?: string;
  };

  /** Session manager that tracks active sessions and their span state. */
  export class SessionManager {
    constructor();
    getAllSessions(): SpanState[];
    getSession(id: string): SpanState | undefined;
    endSession(id: string): void;
  }
  /**
 * Trace context utilities used to inject/extract trace headers for HTTP calls.
 * The concrete implementation uses OpenTelemetry APIs.
 */
  export class TraceContextManager {
    /** Inject trace context into headers (returns mutated headers) */
    inject(headers: Record<string, string>): Record<string, string>;

    /** Extract trace context from incoming headers (returns opaque context) */
    extract(headers: Record<string, string>): unknown;
  }
  /** MessageProcessor encapsulates processing of incoming JSON-RPC messages */
  export class MessageProcessor {
    constructor();
    process(message: JSONRPCMessage): Promise<void>;
  }
  /**
     * Minimal JSON-RPC message shape used by the instrumented transport.
     *
     * The runtime defines a full Zod-backed union (`JSONRPCMessage`) with
     * request/response/notification/error variants. For the purposes of
     * the instrumented transport ambient declarations we expose an opaque
     * but documented alias so editors show helpful context while keeping the
     * declaration self-contained.
     */
  export type JSONRPCMessage = unknown;

  /**
   * A lightweight declaration for the base SSE MCP transport used by the
   * InstrumentedSseTransport. We declare the minimal surface area the
   * instrumented wrapper relies on (event callbacks and lifecycle methods)
   * so the ambient declarations don't import implementation types.
   */
  export class SseMCPTransport {
    /** Event fired when the transport is closed */
    onclose?: (() => void) | undefined;
    /** Event fired when an error occurs */
    onerror?: ((error: unknown) => void) | undefined;
    /** Event fired for each incoming JSON-RPC message */
    onmessage?: ((message: JSONRPCMessage) => void) | undefined;

    constructor(options?: { url?: string; headers?: Record<string, string> });

    /** Start the transport and establish connection */
    start(): Promise<void>;

    /** Close the transport and clean up resources */
    close(): Promise<void>;

    /** Send a JSON-RPC message over the transport */
    send(message: JSONRPCMessage): Promise<void>;
  }


  /**
   * Options passed to the instrumented SSE transport constructor.
   */
  export type InstrumentedSseTransportOptions = {
    url: string;
    headers?: Record<string, string>;
    onclose?: () => void;
    onmessage?: (message: JSONRPCMessage) => void;
    onerror?: ((error: unknown) => void) | ((error: Error) => void);
  };

  /**
   * Instrumented SSE Transport with OpenTelemetry instrumentation.
   *
   * This class extends the base `SseMCPTransport` and adds metrics, tracing,
   * session management, and helper utilities for production telemetry.
   */
  export class InstrumentedSseTransport extends SseMCPTransport {
    constructor(options: InstrumentedSseTransportOptions);

    /** Returns current active counters (sessions/tool calls) */
    getActiveCounters(): ActiveCounters;

    /** Reset active counters to zero (manual debugging utility) */
    resetActiveCounters(): void;

    /** Returns debug info for all sessions (opaque shape) */
    getSessionDebugInfo(): unknown;

    /** Force-completes a stuck tool call (debugging utility) */
    forceCompleteToolCall(id: string): boolean;

    /** Returns enhanced headers enriched with trace context */
    getEnhancedHeaders(): Record<string, string>;

    /** Updates given headers in-place with trace context */
    updateHeadersWithTraceContext(headers: Record<string, string>): void;

    /** Static helper to inject trace context into headers */
    static injectTraceContext(
      headers: Record<string, string>,
    ): Record<string, string>;
  }

  /** Transport plugin interface for extensions */
  export interface TransportPlugin {
    name: string;
    initialize?(transport: InstrumentedSseTransport): Promise<void> | void;
  }

  export { InstrumentedSseTransport as OriginalInstrumentedSseTransport };
}

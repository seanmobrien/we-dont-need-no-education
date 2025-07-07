import { trace, Span, SpanStatusCode } from '@opentelemetry/api';
// @ts-expect-error - Module resolution issue with @modelcontextprotocol/sdk
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';
// @ts-expect-error - Module resolution issue with @modelcontextprotocol/sdk
import type { SSEClientTransportOptions } from '@modelcontextprotocol/sdk/client/sse';
// @ts-expect-error - Module resolution issue with @modelcontextprotocol/sdk
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types';
import { isError, LoggedError } from '@/lib/react-util';
import { log } from '@/lib/logger';

export { SSEClientTransport };
export type { SSEClientTransportOptions, JSONRPCMessage };

interface SpanState {
  span: Span;
  idleTimer: ReturnType<typeof setTimeout>;
}

const tracer = trace.getTracer('mcp-client');
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export class InstrumentedSseTransport implements SSEClientTransport {
  private readonly base: SSEClientTransport;
  private sessions = new Map<string, SpanState>();

  // Match the actual SSEClientTransport interface
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;

  constructor(url: URL, opts?: SSEClientTransportOptions) {
    this.base = new SSEClientTransport(url, {
      ...opts,
      onmessage: (message: JSONRPCMessage) => this.handleMessage(message),
      onerror: (error: Error) => this.handleError(error),
      onclose: () => this.handleClose(),
    });
  }

  async start(): Promise<void> {
    await this.base.start();
  }

  async finishAuth(authorizationCode: string): Promise<void> {
    await this.base.finishAuth(authorizationCode);
  }

  async close(): Promise<void> {
    await this.base.close();
    this.handleClose(); // explicitly close spans if not already
  }

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      const sessionId = message.id ?? 'default';

      const state = this.sessions.get(sessionId);
      if (state) {
        // Inject trace context if possible
        const enrichedMessage = {
          ...message,
          metadata: {
            ...message.metadata,
            // Add trace context
          },
        };
        await this.base.send(enrichedMessage);
      } else {
        await this.base.send(message);
      }
    } catch (err) {
      console.warn('[otel] Failed to inject trace context', err);
      await this.base.send(message);
    }
  }

  onUncaughtError(error: unknown): void | object {
    try {
      log((l) =>
        l.error(
          'MCP Client Uncaught Error:',
          error,
          isError(error) ? error.stack : {},
        ),
      );
      let errorMessage: string;
      if (isError(error)) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
        error = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          cause: error,
          source: 'mcp-client',
          log: false,
        });
      }
      for (const { span } of this.sessions.values()) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `Unhandled Error: ${errorMessage}`,
        });
      }
      return {
        role: 'assistant',
        content: `An error occurred while processing your request: ${isError(error) ? error.message : String(error)}. Please try again later.`,
      };
    } catch (e) {
      console.error('Error handling uncaught error in MCP client:', e);
    }
  }
  // === Internal Handlers (wired to base transport) ===

  private handleMessage(message: JSONRPCMessage) {
    try {
      const sessionId = message.id ?? 'default';
      let state = this.sessions.get(sessionId);

      if (!state) {
        const span = tracer.startSpan('mcp.session', {
          attributes: {
            'mcp.session.id': sessionId,
          },
        });
        state = {
          span,
          idleTimer: this.setIdleTimer(sessionId),
        };
        this.sessions.set(sessionId, state);
      }

      clearTimeout(state.idleTimer);
      state.idleTimer = this.setIdleTimer(sessionId);

      state.span.addEvent('mcp.message.received', {
        'mcp.message.id': message.id,
      });

      this.onmessage?.(message); // pass through to client
    } catch (e) {
      this.handleError(isError(e) ? e : new Error(String(e)));
    }
  }

  private handleError(error: Error) {
    try {
      for (const { span } of this.sessions.values()) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      }

      this.onerror?.(error); // pass through to client
    } catch (e) {
      // Errors handling errors is no bueno...
      log((l) => l.error('MCP Client Error Handler Error:', e));
    }
  }

  private handleClose() {
    try {
      for (const [, { span }] of this.sessions.entries()) {
        span.addEvent('mcp.session.closed');
        span.end();
      }
      this.sessions.clear();

      this.onclose?.(); // pass through to client
    } catch (e) {
      this.handleError(isError(e) ? e : new Error(String(e)));
    }
  }

  private setIdleTimer(sessionId: string): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      try {
        const state = this.sessions.get(sessionId);
        if (state) {
          state.span.addEvent('mcp.session.idle_timeout');
          state.span.end();
          this.sessions.delete(sessionId);
        }
      } catch (e) {
        log((l) => l.error('MCP Client Idle Timer Error:', e));
      }
    }, IDLE_TIMEOUT_MS);
  }
}

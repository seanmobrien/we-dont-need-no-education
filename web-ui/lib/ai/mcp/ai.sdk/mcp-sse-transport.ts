// Original source: https://github.com/vercel/ai/blob/ai%404.3.16/packages/ai/core/tool/mcp/mcp-sse-transport.ts

import {
  EventSourceMessage,
  EventSourceParserStream,
} from '@ai-sdk/provider-utils';
import { Transport as MCPTransport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { MCPError } from '../mcp-error'
import { JSONRPCMessage, JSONRPCMessageSchema } from './json-rpc-message';
import { log, safeSerialize } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { isAbortError } from '@/lib/react-util/utility-methods';
import { createInstrumentedSpan } from '@/lib/nextjs-util/server/utils';
import { fetch } from '@/lib/nextjs-util/server/fetch';
import type { Span } from '@opentelemetry/api';

const MCP_CONNECTION_TIMEOUT = {
  socket: 5 * 60 * 1000,
  connect: 60 * 1000,
  request: 15 * 60 * 1000,
};

export class SseMCPTransport implements MCPTransport {
  /** The discovered endpoint URL for sending messages via POST */
  protected endpoint?: URL;
  /** AbortController for canceling ongoing requests */
  protected abortController?: AbortController;
  /** The initial SSE connection URL */
  protected url: URL;
  /** Current connection status */
  protected connected = false;
  /** Flag to prevent multiple simultaneous connection attempts */
  protected connecting = false;
  /** Promise for ongoing connection attempt */
  protected connectionPromise?: Promise<void>;
  /** SSE connection wrapper with close and optional destroy methods */
  protected sseConnection?: {
    close: () => Promise<void>;
    /** Best-effort destroy: free underlying stream resources */
    destroy?: () => Promise<void> | void;
  };
  /** HTTP headers to include in requests - can be static or async function */
  private headers?:
    | Record<string, string>
    | (() => Promise<Record<string, string>>);
  /**
   * Callback invoked when the connection is closed.
   * @event
   */
  private _onclose?: () => void;
  get onclose(): (() => void) | undefined {
    return this._onclose;
  }
  set onclose(handler: (() => void) | undefined) {
    this._onclose = handler;
  }

  private _onerror?: (error: unknown) => void;
  get onerror(): ((error: unknown) => void) | undefined {
    return this._onerror;
  }
  set onerror(handler: ((error: unknown) => void) | undefined) {
    this._onerror = handler;
  }

  private _onmessage?: (message: JSONRPCMessage) => void;
  get onmessage(): ((message: JSONRPCMessage) => void) | undefined {
    return this._onmessage;
  }
  set onmessage(handler: ((message: JSONRPCMessage) => void) | undefined) {
    this._onmessage = handler;
  }

  constructor({
    url,
    headers,
  }: {
    url: string;
    headers?: Record<string, string> | (() => Promise<Record<string, string>>);
  }) {
    this.url = new URL(url);
    this.headers = headers;
  }

  async start(): Promise<void> {
    // If already connected, resolve immediately
    if (this.connected) {
      log((l) =>
        l.info('SSE Transport already connected, resolving immediately'),
      );
      return Promise.resolve();
    }

    // If a connection is already in progress, wait for it
    if (this.connecting && this.connectionPromise) {
      log((l) =>
        l.info('SSE Transport connection already in progress, waiting...'),
      );
      return this.connectionPromise;
    }

    // Mark as connecting and create the connection promise
    this.connecting = true;

    this.connectionPromise = new Promise<void>(async (resolve, reject) => {
      log((l) =>
        l.info('SSE Transport starting connection', { url: this.url.href }),
      );
      this.abortController = new AbortController();
      let reader: ReadableStream<EventSourceMessage> | undefined;
      try {
        log((l) =>
          l.info('SSE Transport: Fetching SSE endpoint', {
            url: this.url.href,
          }),
        );
        const response = await fetch(this.url.href, {
          headers: await this.resolveHeaders(),
          signal: this.abortController?.signal,
          timeout: MCP_CONNECTION_TIMEOUT,
        });

        log((l) =>
          l.info('SSE Transport: Received response', {
            status: response.status,
            ok: response.ok,
            hasBody: !!response.body,
          }),
        );

        if (!response.ok || !response.body) {
          const error = new MCPError({
            message: `MCP SSE Transport Error: ${response.status} ${response.statusText}`,
          });
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'MCP SSE Transport::establishConnection',
          });
          this.onerror?.(error);
          this.connecting = false;
          return reject(error);
        }
        // Connection established, now wait for 'endpoint' event
        const stream = response.body
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new EventSourceParserStream());
        // grab our reader and a typed alias for the stream so we can
        // safely call optional methods like cancel() or destroy().
        const reader = stream.getReader();
        const maybeStream = stream as unknown as {
          cancel?: (reason?: unknown) => Promise<void> | void;
          destroy?: () => void;
        };

        // Helper to read an error code safely without using `any`.
        const getErrorCode = (err: unknown): string | undefined => {
          if (err && typeof err === 'object') {
            const c = (err as { code?: unknown }).code;
            return typeof c === 'string' ? c : undefined;
          }
          return undefined;
        };

        // Serialized, idempotent destroy to avoid concurrent cancel() races
        let destroyingPromise: Promise<void> | undefined;
        const doDestroy = async (): Promise<void> => {
          if (destroyingPromise) return destroyingPromise;
          destroyingPromise = (async () => {
            try {
              // cancel the reader if present
              try {
                await reader.cancel('Connection destroyed');
                log((l) => l.verbose('SSE reader cancelled by destroy'));
              } catch (e) {
                // Ignore known race condition in Node's webstreams where cancel
                // may throw ERR_INVALID_STATE when the stream is locked.
                if (
                  !isAbortError(e) &&
                  getErrorCode(e) !== 'ERR_INVALID_STATE'
                ) {
                  LoggedError.isTurtlesAllTheWayDownBaby(e, {
                    message: 'Error cancelling SSE reader during destroy',
                    log: true,
                    source: 'MCP SSE Transport::doDestroy',
                  });
                }
              }

              // Prefer node-style destroy when available, fallback to cancel()
              try {
                if (typeof maybeStream.destroy === 'function') {
                  maybeStream.destroy();
                  log((l) =>
                    l.verbose('Underlying SSE stream destroyed by destroy()'),
                  );
                } else if (maybeStream.cancel) {
                  await maybeStream.cancel('Connection destroyed');
                  log((l) =>
                    l.verbose('Underlying SSE stream cancelled by destroy()'),
                  );
                }
              } catch (e) {
                if (
                  !isAbortError(e) &&
                  getErrorCode(e) !== 'ERR_INVALID_STATE'
                ) {
                  LoggedError.isTurtlesAllTheWayDownBaby(e, {
                    message:
                      'Error destroying/cancelling underlying stream during destroy',
                    log: true,
                    source: 'MCP SSE Transport::doDestroy',
                  });
                }
              }
            } finally {
              this.connected = false;
            }
          })();
          return destroyingPromise;
        };

        this.sseConnection = {
          close: async () => {
            try {
              await doDestroy();
            } catch (e) {
              LoggedError.isTurtlesAllTheWayDownBaby(e, {
                message: 'Error closing SSE connection',
                log: true,
                severity: 'warn',
                source: 'MCP SSE Transport::sseConnection.close',
              });
            }
          },
          destroy: doDestroy,
        };
        const processEvents = async () => {
          try {
            log((l) => l.info('SSE Transport: Entering event processing loop'));
            while (true) {
              log((l) => l.verbose('SSE Transport: Waiting for next event'));
              const { done, value } = await reader.read();
              log((l) =>
                l.info(`SSE Transport (Done: ${done}): Received [${safeSerialize(value?.event)}] event.\n\tData: ${safeSerialize(value?.data)}`, {
                  attribs: {
                    done,
                    hasValue: !!value,
                    event: safeSerialize(value?.event),
                    dataLength: value?.data?.length,
                  }
                }),
              );

              if (done) {
                if (this.connected) {
                  this.connected = false;
                  log((l) =>
                    l.warn(
                      `SSE connection closed unexpectedly!`,
                    ),
                  );
                }
                return;
              }

              const { event, data } = value;

              log((l) =>
                l.info('SSE Transport: Processing event', {
                  event,
                  dataPreview: data?.substring(0, 100),
                }),
              );

              if (event === 'endpoint') {
                log((l) =>
                  l.info('SSE Transport: Received endpoint event', { data }),
                );
                this.endpoint = new URL(data, this.url);

                if (this.endpoint.origin !== this.url.origin) {
                  throw new MCPError({
                    message: `MCP SSE Transport Error: Endpoint origin does not match connection origin: ${this.endpoint.origin}`,
                  });
                }

                this.connected = true;
                this.connecting = false;
                log((l) =>
                  l.info(
                    'SSE Transport: Connection established, endpoint set',
                    { endpoint: this.endpoint?.href },
                  ),
                );
                resolve();
              } else if (event === 'message') {
                try {
                  const message = JSONRPCMessageSchema.parse(JSON.parse(data));
                  this.onmessage?.(message);
                } catch (error) {
                  LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: 'MCP SSE Transport::processEvents',
                  });
                  const e = new MCPError({
                    message: 'MCP SSE Transport Error: Failed to parse message',
                    cause: error,
                  });
                  this.onerror?.(e);
                  // We do not throw here so we continue processing events after reporting the error
                  resolve();
                }
              }
            }
          } catch (error) {
            if (
              (error instanceof Error && error.name === 'AbortError') ||
              (error instanceof TypeError && error.message === 'terminated')
            ) {
              resolve();
              return;
            }
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
              message: `MCP SSE Transport: Connection error - ${LoggedError.buildMessage(error)}`,
              log: true,
              source: 'MCP SSE Transport::processEvents',
            });
            this.onerror?.(error);
            this.connecting = false;
            reject(error);
          }
        };

        log((l) => l.info('SSE Transport: Starting event processing'));
        await processEvents();
      } catch (error) {
        if (isAbortError(error)) {
          // no-op
          this.sseConnection?.close();
          resolve();
          return;
        }
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          message: `MCP SSE Transport: Connection error - ${LoggedError.buildMessage(error)}`,
          log: true,
          source: 'MCP SSE Transport::establishConnection',
        });
        this.sseConnection?.close();
        (reader?.cancel(error) ?? Promise.resolve()).catch((e) => {
          log((l) =>
            l.verbose('Error cancelling reader after connection failure', e),
          );
        });
        this.onerror?.(error);
        this.connecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  protected async resolveHeaders(): Promise<Headers> {
    const headerRecord =
      typeof this.headers === 'function' ? await this.headers() : this.headers;
    const headers = new Headers(headerRecord);
    headers.set('Accept', 'text/event-stream');
    return headers;
  }

  async close(): Promise<void> {
    await this.withSpan('mcp.transport.sse.close', async () => {
      this.connected = false;
      this.connecting = false;
      this.connectionPromise = undefined;
      const connection = this.sseConnection
        ?.close()
        .catch((e) => {
          LoggedError.isTurtlesAllTheWayDownBaby(e, {
            message: 'Error closing SSE connection',
            log: true,
            severity: 'warn',
            source: 'MCP SSE Transport::close',
          });
        })
        .finally(() => {
          this.sseConnection = undefined;
        });
      this.abortController?.abort();
      await connection;
      this.onclose?.();
    });
  }

  /**
   * Executes a callback within an instrumented OpenTelemetry span.
   *
   * This method wraps `createInstrumentedSpan` to provide convenient span-based
   * instrumentation for transport operations. The span is automatically:
   * - Started with the provided name and attributes
   * - Set as the active span during callback execution
   * - Marked as successful if callback completes without error
   * - Marked as failed and records exception if callback throws
   * - Ended after callback completes (success or failure)
   *
   * @param spanName - Name of the span (e.g., 'mcp.transport.operation')
   * @param callback - Async function to execute within the span context
   * @param attributes - Optional span attributes (key-value pairs)
   * @returns Promise resolving to the callback's return value
   *
   * @example
   * ```typescript
   * const result = await transport.withSpan(
   *   'mcp.custom.operation',
   *   async (span) => {
   *     span.setAttribute('custom.attribute', 'value');
   *     return await performOperation();
   *   },
   *   { 'operation.type': 'custom' }
   * );
   * ```
   */
  protected async withSpan<TResult>(
    spanName: string,
    callback: (span: Span) => Promise<TResult>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<TResult> {
    const instrumented = await createInstrumentedSpan({
      spanName,
      attributes,
      tracerName: 'mcp-transport',
      autoLog: true,
    });

    return await instrumented.executeWithContext(callback);
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.endpoint || !this.connected) {
      throw new MCPError({
        message: 'MCP SSE Transport Error: Not connected',
      });
    }
    await this.withSpan('mcp.transport.sse.send', async (span) => {
      span.setAttribute('mcp.send.message', safeSerialize(message));
      try {
        const headers = await this.resolveHeaders();
        headers.set('Content-Type', 'application/json');
        const init = {
          method: 'POST',
          headers,
          body: JSON.stringify(message),
          signal: this.abortController?.signal,
          timeout: MCP_CONNECTION_TIMEOUT,
        };

        const response = await fetch(this.endpoint!, init);

        if (!response.ok) {
          const text = await response.text().catch(() => null);
          const error = new MCPError({
            message: `MCP SSE Transport Error: POSTing to endpoint (HTTP ${response.status}): ${text}`,
          });
          const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            data: {
              status: response.status,
              statusText: response.statusText,
              body: text,
              url: this.endpoint?.href,
              response: safeSerialize(response),
            },
            source: 'MCP SSE Transport::send',
          });
          span.recordException(le);
          this.onerror?.(le);
          return;
        }
        log((l) => l.info('MCP SSE Transport: Message sent successfully'));
      } catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
          message: `MCP SSE Transport: Send error - ${LoggedError.buildMessage(error)}`,
          log: true,
          source: 'MCP SSE Transport::send',
        });
        span.recordException(le);

        this.onerror?.(le);
        return;
      }
    });
  }
}

export const deserializeMessage = (line: string): JSONRPCMessage =>
  JSONRPCMessageSchema.parse(JSON.parse(line));

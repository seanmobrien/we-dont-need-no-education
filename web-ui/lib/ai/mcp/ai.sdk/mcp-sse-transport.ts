// Original source: https://github.com/vercel/ai/blob/ai%404.3.16/packages/ai/core/tool/mcp/mcp-sse-transport.ts

import {
  EventSourceMessage,
  EventSourceParserStream,
} from '@ai-sdk/provider-utils';
import { MCPTransport, MCPClientError } from 'ai';
import { JSONRPCMessage, JSONRPCMessageSchema } from './json-rpc-message';
import { fetch } from '@/lib/nextjs-util/fetch';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { isAbortError } from '@/lib/react-util/utility-methods';

export class SseMCPTransport implements MCPTransport {
  /** The discovered endpoint URL for sending messages via POST */
  protected endpoint?: URL;
  /** AbortController for canceling ongoing requests */
  protected abortController?: AbortController;
  /** The initial SSE connection URL */
  protected url: URL;
  /** Current connection status */
  protected connected = false;
  /** SSE connection wrapper with close and optional destroy methods */
  protected sseConnection?: {
    close: () => Promise<void>;
    /** Best-effort destroy: free underlying stream resources */
    destroy?: () => Promise<void> | void;
  };
  /** HTTP headers to include in requests */
  private headers?: Record<string, string>;
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
    headers?: Record<string, string>;
  }) {
    this.url = new URL(url);
    this.headers = headers;
  }

  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.connected) {
        return resolve();
      }

      this.abortController = new AbortController();

      const establishConnection = async () => {
        let reader: ReadableStream<EventSourceMessage> | undefined;
        try {
          const response = await fetch(this.url.href, {
            headers: await this.resolveHeaders(),
            signal: this.abortController?.signal,
          });

          if (!response.ok || !response.body) {
            const error = new MCPClientError({
              message: `MCP SSE Transport Error: ${response.status} ${response.statusText}`,
            });
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
              log: true,
              source: 'MCP SSE Transport::establishConnection',
            });
            this.onerror?.(error);
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
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  if (this.connected) {
                    this.connected = false;
                    throw new MCPClientError({
                      message:
                        'MCP SSE Transport Error: Connection closed unexpectedly',
                    });
                  }
                  return;
                }

                const { event, data } = value;

                if (event === 'endpoint') {
                  this.endpoint = new URL(data, this.url);

                  if (this.endpoint.origin !== this.url.origin) {
                    throw new MCPClientError({
                      message: `MCP SSE Transport Error: Endpoint origin does not match connection origin: ${this.endpoint.origin}`,
                    });
                  }

                  this.connected = true;
                  resolve();
                } else if (event === 'message') {
                  try {
                    const message = JSONRPCMessageSchema.parse(
                      JSON.parse(data),
                    );
                    this.onmessage?.(message);
                  } catch (error) {
                    const e = new MCPClientError({
                      message:
                        'MCP SSE Transport Error: Failed to parse message',
                      cause: error,
                    });
                    this.onerror?.(e);
                    // We do not throw here so we continue processing events after reporting the error
                    resolve();
                  }
                }
              }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                resolve();
                return;
              }
              LoggedError.isTurtlesAllTheWayDownBaby(error, {
                message: `MCP SSE Transport: Connection error - ${LoggedError.buildMessage(error)}`,
                log: true,
                source: 'MCP SSE Transport::processEvents',
              });
              this.onerror?.(error);
              reject(error);
            }
          };

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
          reject(error);
        }
      };

      establishConnection();
    });
  }

  protected async resolveHeaders(): Promise<Headers> {
    const headers = new Headers(this.headers);
    headers.set('Accept', 'text/event-stream');
    return headers;
  }

  async close(): Promise<void> {
    this.connected = false;
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
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.endpoint || !this.connected) {
      throw new MCPClientError({
        message: 'MCP SSE Transport Error: Not connected',
      });
    }

    try {
      const headers = await this.resolveHeaders();
      headers.set('Content-Type', 'application/json');
      const init = {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: this.abortController?.signal,
      };

      const response = await fetch(this.endpoint, init);

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        const error = new MCPClientError({
          message: `MCP SSE Transport Error: POSTing to endpoint (HTTP ${response.status}): ${text}`,
        });
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
          log: true,
          data: {
            status: response.status,
            statusText: response.statusText,
            body: text,
            url: this.endpoint?.href,
          },
          source: 'MCP SSE Transport::send',
        });
        this.onerror?.(error);
        return;
      }
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        message: `MCP SSE Transport: Send error - ${LoggedError.buildMessage(error)}`,
        log: true,
        source: 'MCP SSE Transport::send',
      });
      this.onerror?.(error);
      return;
    }
  }
}

export const deserializeMessage = (line: string): JSONRPCMessage =>
  JSONRPCMessageSchema.parse(JSON.parse(line));

/**
 * @fileoverview MCP SSE Transport Implementation
 *
 * This module provides a Server-Sent Events (SSE) based transport layer for the
 * Model Context Protocol (MCP), enabling real-time bidirectional communication
 * between MCP clients and servers over HTTP.
 *
 * ## License and Attribution
 *
 * This code is derived from Vercel's AI SDK and is redistributed under the
 * Apache License 2.0. Original source:
 * https://github.com/vercel/ai/blob/ai%404.3.16/packages/ai/core/tool/mcp/mcp-sse-transport.ts
 *
 * Copyright 2023 Vercel, Inc.
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
 *
 * ## Overview
 *
 * The SseMCPTransport class implements the MCPTransport interface to provide:
 *
 * - **Bidirectional Communication**: Receives messages via SSE and sends via HTTP POST
 * - **Connection Management**: Handles connection lifecycle, reconnection, and cleanup
 * - **Error Handling**: Comprehensive error reporting and recovery mechanisms
 * - **Message Validation**: JSON-RPC message schema validation
 * - **Security**: Origin validation for endpoint redirection
 *
 * ## Protocol Flow
 *
 * 1. **Connection Establishment**: Client connects to SSE endpoint
 * 2. **Endpoint Discovery**: Server sends 'endpoint' event with POST URL
 * 3. **Message Exchange**:
 *    - Incoming: Received via 'message' SSE events
 *    - Outgoing: Sent via HTTP POST to discovered endpoint
 * 4. **Connection Termination**: Graceful cleanup of resources
 *
 * ## Usage Example
 *
 * ```typescript
 * const transport = new SseMCPTransport({
 *   url: 'https://api.example.com/mcp/sse',
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 *
 * transport.onmessage = (message) => {
 *   console.log('Received:', message);
 * };
 *
 * transport.onerror = (error) => {
 *   console.error('Transport error:', error);
 * };
 *
 * await transport.start();
 * await transport.send({ method: 'ping', id: 1 });
 * ```
 *
 * ## Security Considerations
 *
 * - **Origin Validation**: Endpoint redirects are validated against the initial URL origin
 * - **HTTPS Recommended**: Use HTTPS in production for secure communication
 * - **Header Authentication**: Custom headers can be used for authentication
 *
 * @module mcp-sse-transport
 * @version 1.0.0
 * @author Derived from Vercel AI SDK
 * @license Apache-2.0
 */

// Original source: https://github.com/vercel/ai/blob/ai%404.3.16/packages/ai/core/tool/mcp/mcp-sse-transport.ts

import {
  EventSourceMessage,
  EventSourceParserStream,
} from '@ai-sdk/provider-utils';
import { MCPTransport, MCPClientError } from 'ai';
import { JSONRPCMessage, JSONRPCMessageSchema } from './json-rpc-message';
import { fetch } from '/lib/nextjs-util/fetch';
import { log } from '/lib/logger';
import { LoggedError } from '/lib/react-util/errors/logged-error';
import { isAbortError } from '/lib/react-util/utility-methods';
/**
 * SSE-based transport implementation for Model Context Protocol (MCP).
 *
 * This class provides a robust transport layer that:
 * - Establishes SSE connections for receiving messages
 * - Uses HTTP POST for sending messages to a discovered endpoint
 * - Handles connection lifecycle and error recovery
 * - Validates message origins for security
 *
 * @implements {MCPTransport}
 *
 * @example
 * ```typescript
 * const transport = new SseMCPTransport({
 *   url: 'https://mcp-server.example.com/sse',
 *   headers: { 'Authorization': 'Bearer your-token' }
 * });
 *
 * transport.onmessage = (msg) => console.log('Received:', msg);
 * transport.onerror = (err) => console.error('Error:', err);
 *
 * await transport.start();
 * await transport.send({ method: 'tools/list', id: 1 });
 * ```
 */
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

  /**
   * Callback invoked when an error occurs.
   * @event
   * @param error - The error that occurred
   */
  private _onerror?: (error: unknown) => void;
  get onerror(): ((error: unknown) => void) | undefined {
    return this._onerror;
  }
  set onerror(handler: ((error: unknown) => void) | undefined) {
    this._onerror = handler;
  }

  /**
   * Callback invoked when a message is received.
   * @event
   * @param message - The received JSON-RPC message
   */
  private _onmessage?: (message: JSONRPCMessage) => void;
  get onmessage(): ((message: JSONRPCMessage) => void) | undefined {
    return this._onmessage;
  }
  set onmessage(handler: ((message: JSONRPCMessage) => void) | undefined) {
    this._onmessage = handler;
  }

  /**
   * Creates a new SSE MCP Transport instance.
   *
   * @param options - Configuration options
   * @param options.url - The SSE endpoint URL to connect to
   * @param options.headers - Optional HTTP headers to include in requests
   *
   * @throws {TypeError} If the provided URL is invalid
   *
   * @example
   * ```typescript
   * const transport = new SseMCPTransport({
   *   url: 'https://api.example.com/mcp/events',
   *   headers: {
   *     'Authorization': 'Bearer token',
   *     'X-Client-Version': '1.0.0'
   *   }
   * });
   * ```
   */
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

  /**
   * Establishes the SSE connection and waits for endpoint discovery.
   *
   * This method:
   * 1. Creates an SSE connection to the configured URL
   * 2. Waits for an 'endpoint' event containing the POST URL
   * 3. Validates the endpoint origin matches the SSE URL origin
   * 4. Begins processing incoming 'message' events
   *
   * @returns Promise that resolves when the connection is established and endpoint is discovered
   *
   * @throws {MCPClientError} When connection fails, endpoint is invalid, or other transport errors occur
   *
   * @example
   * ```typescript
   * try {
   *   await transport.start();
   *   console.log('Connected successfully');
   * } catch (error) {
   *   console.error('Failed to connect:', error);
   * }
   * ```
   */
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

  /**
   * Resolves and returns the headers used for requests.
   * @returns Promise that resolves to the headers for requests
   */
  protected async resolveHeaders(): Promise<Headers> {
    const headers = new Headers(this.headers);
    headers.set('Accept', 'text/event-stream');
    return headers;
  }

  /**
   * Closes the transport connection and cleans up resources.
   *
   * This method:
   * - Closes the SSE connection
   * - Aborts any ongoing HTTP requests
   * - Triggers the onclose callback
   * - Resets the connection state
   *
   * @returns Promise that resolves when cleanup is complete
   *
   * @example
   * ```typescript
   * await transport.close();
   * console.log('Transport closed');
   * ```
   */
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

  /**
   * Sends a JSON-RPC message to the server via HTTP POST.
   *
   * This method:
   * - Validates that the transport is connected and endpoint is available
   * - Sends the message as JSON to the discovered endpoint
   * - Handles HTTP errors gracefully by calling onerror instead of throwing
   *
   * @param message - The JSON-RPC message to send
   *
   * @throws {MCPClientError} Only when not connected (no endpoint available)
   *
   * @example
   * ```typescript
   * await transport.send({
   *   jsonrpc: '2.0',
   *   method: 'tools/list',
   *   id: 1
   * });
   * ```
   */
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

/**
 * Deserializes a JSON string into a validated JSON-RPC message.
 *
 * This utility function parses a JSON string and validates it against
 * the JSON-RPC message schema to ensure it conforms to the expected format.
 *
 * @param line - JSON string containing the message data
 * @returns Validated JSON-RPC message object
 *
 * @throws {Error} When JSON parsing fails or schema validation fails
 *
 * @example
 * ```typescript
 * const message = deserializeMessage('{"jsonrpc":"2.0","method":"ping","id":1}');
 * console.log(message.method); // "ping"
 * ```
 *
 * @deprecated This function is included for compatibility but consider using
 * the schema validation directly in your application code.
 */
export const deserializeMessage = (line: string): JSONRPCMessage =>
  JSONRPCMessageSchema.parse(JSON.parse(line));

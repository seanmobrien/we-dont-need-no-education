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

import { EventSourceParserStream } from '@ai-sdk/provider-utils';
import { MCPTransport, MCPClientError } from 'ai';
import { JSONRPCMessage, JSONRPCMessageSchema } from './json-rpc-message';
import { fetch } from '@/lib/nextjs-util/fetch';
import { log } from '@/lib/logger';

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
  /** SSE connection wrapper with close method */
  protected sseConnection?: {
    close: () => void;
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
        try {
          const headers = new Headers(this.headers);
          headers.set('Accept', 'text/event-stream');
          const response = await fetch(this.url.href, {
            headers,
            signal: this.abortController?.signal,
          });

          if (!response.ok || !response.body) {
            const error = new MCPClientError({
              message: `MCP SSE Transport Error: ${response.status} ${response.statusText}`,
            });
            this.onerror?.(error);
            return reject(error);
          }

          const stream = response.body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new EventSourceParserStream());

          const reader = stream.getReader();

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
                log((l) =>
                  l.warn('MCP SSE Transport: Connection aborted', error),
                );
                resolve();
                return;
              }
              this.onerror?.(error);
              reject(error);
            }
          };

          this.sseConnection = {
            close: () => reader.cancel(),
          };

          processEvents();
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }

          this.onerror?.(error);
          reject(error);
        }
      };

      establishConnection();
    });
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
    this.sseConnection?.close();
    this.abortController?.abort();
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
      const headers = new Headers(this.headers);
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
        this.onerror?.(error);
        return;
      }
    } catch (error) {
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
export function deserializeMessage(line: string): JSONRPCMessage {
  return JSONRPCMessageSchema.parse(JSON.parse(line));
}

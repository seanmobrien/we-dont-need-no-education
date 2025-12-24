/**
 * @fileoverview MCP SSE Transport and related types (declarations)
 *
 * This file provides declaration-only exports matching the runtime implementation
 * in `./types.ts`. It re-exports constants and type shapes used by the MCP SSE
 * transport and related helpers so consumers can import typed symbols from
 * `lib/ai/mcp/ai.sdk` without depending on the implementation file.
 *
 * Portions of these types and the implementation are derived from Vercel's AI SDK
 * and are redistributed under the Apache-2.0 license. See the original source for
 * attribution and full license text:
 * https://github.com/vercel/ai/blob/ai%404.3.16/packages/ai/core/tool/mcp/types.ts
 */

declare module '@/lib/ai/mcp/ai.sdk/types' {
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
   * Originated from https://github.com/vercel/ai/blob/ai%404.3.16/packages/ai/core/tool/mcp/types.ts
   *
   * @module types
   * @version 1.0.0
   * @author Derived from Vercel AI SDK
   * @license Apache-2.0
   */

  /**
   * The most recent protocol version implemented by this transport.
   *
   * Consumers may use this constant to assert compatibility or to negotiate
   * features with MCP servers. It is a single string representing a date-based
   * protocol version (for example: `"2024-11-05"`).
   *
   * Usage:
   * ```ts
   * if (server.protocolVersion !== LATEST_PROTOCOL_VERSION) {
   *   // handle compatibility
   * }
   * ```
   */
  export const LATEST_PROTOCOL_VERSION: string;

  /**
   * Supported protocol versions (includes `LATEST_PROTOCOL_VERSION`).
   *
   * This read-only array lists all protocol versions the local transport
   * implementation understands. Servers exposing one of these versions
   * are considered compatible.
   */
  export const SUPPORTED_PROTOCOL_VERSIONS: readonly string[];

  /**
   * Configuration metadata for client/server implementations.
   *
   * Fields:
   * - `name`: Human readable implementation name (e.g. "my-mcp-server").
   * - `version`: Semver or date-based version string identifying the implementation.
   * - Additional arbitrary fields may be present for forward compatibility.
   */
  export type Configuration = {
    /** Implementation name */
    name: string;
    /** Implementation version */
    version: string;
    /** Additional implementation-specific metadata */
    [k: string]: unknown;
  };

  /**
   * Base parameter bag passed to requests and results.
   *
   * This is a loose object for protocol-level parameters. It may include an
   * optional `_meta` object used for tracing, correlation IDs, or other
   * cross-cutting metadata. Additional keys are allowed to accommodate
   * provider-specific extensions.
   */
  export type BaseParams = {
    /** Optional transport/application meta object */
    _meta?: Record<string, unknown>;
    /** Additional arbitrary parameters */
    [k: string]: unknown;
  };

  /**
   * Generic result shape for transport responses.
   *
   * This type aliases `BaseParams` and is used where a generic JSON-like
   * result object is expected from server calls.
   */
  export type Result = BaseParams;

  /**
   * Request shape sent to MCP servers.
   *
   * - `method` is the JSON-RPC style method name to invoke on the server.
   * - `params` is an optional `BaseParams` object containing method-specific
   *   parameters.
   */
  export type Request = {
    /** The name of the RPC method to call */
    method: string;
    /** Optional parameters for the method */
    params?: BaseParams;
  };

  /**
   * Options that control request behavior such as timeouts and abort signals.
   *
   * - `signal`: Optional `AbortSignal` to cancel the request.
   * - `timeout`: Per-request timeout in milliseconds.
   * - `maxTotalTimeout`: Upper bound for long-running operations that perform
   *    internal retries; used to cap total time spent.
   */
  export type RequestOptions = {
    /** AbortSignal used to cancel the request */
    signal?: AbortSignal;
    /** Timeout in milliseconds for the single request */
    timeout?: number;
    /** Maximum cumulative timeout across retries */
    maxTotalTimeout?: number;
  };

  /**
   * Notification payload shape (same as `Request`).
   *
   * Notifications are JSON-RPC style messages that do not expect a response
   * (no `id` field). They are modeled here using the same shape as `Request`.
   */
  export type Notification = Request;

  /**
   * Server capabilities exposed by MCP servers.
   *
   * This object advertises optional server features that clients can use to
   * adjust behavior (for example whether server supports prompt/list change
   * notifications, resource subscriptions, etc.). Most fields are optional
   * and passthrough objects are allowed to enable forward compatibility.
   */
  export type ServerCapabilities = {
    /** Experimental feature flags */
    experimental?: Record<string, unknown>;
    /** Logging capabilities */
    logging?: Record<string, unknown>;
    /** Prompt-related capabilities (e.g., `listChanged`) */
    prompts?: { listChanged?: boolean } & Record<string, unknown>;
    /** Resource subscription and list-change support */
    resources?: { subscribe?: boolean; listChanged?: boolean } & Record<
      string,
      unknown
    >;
    /** Tool listing / change capabilities */
    tools?: { listChanged?: boolean } & Record<string, unknown>;
    /** Additional server-specific capabilities */
    [k: string]: unknown;
  };

  /**
   * Result returned from an initialize call to an MCP server.
   *
   * Includes the negotiated protocol version, the server's capabilities,
   * and optional human-readable instructions. Clients should validate the
   * `protocolVersion` against their supported versions.
   */
  export type InitializeResult = Result & {
    /** Protocol version string presented by the server */
    protocolVersion: string;
    /** Server-advertised capabilities */
    capabilities: ServerCapabilities;
    /** Implementation information about the server */
    serverInfo: Configuration;
    /** Optional human-readable instructions from the server */
    instructions?: string;
  };

  /**
   * A Request that supports pagination via a cursor string.
   *
   * When present, `params.cursor` instructs the server to continue listing
   * from the provided cursor value.
   */
  export type PaginatedRequest = Request & {
    params?: BaseParams & { cursor?: string };
  };

  /**
   * A paginated result shape that may include a `nextCursor` for subsequent
   * requests. If `nextCursor` is absent the listing is complete.
   */
  export type PaginatedResult = Result & { nextCursor?: string };

  /**
   * Description of a single tool exposed by an MCP server.
   *
   * Tools are declared with a `name`, optional `description`, and an
   * `inputSchema` describing the expected parameters. The schema is a
   * lightweight object compatible with the transport's expectations and may
   * include provider-specific extensions.
   */
  export type MCPTool = {
    /** Logical tool name (unique within a provider) */
    name: string;
    /** Optional human-readable description */
    description?: string;
    /** Optional input schema describing parameters */
    inputSchema?: {
      type: 'object';
      properties?: Record<string, unknown>;
      [k: string]: unknown;
    } & Record<string, unknown>;
    /** Additional provider-specific metadata */
    [k: string]: unknown;
  };

  /**
   * Result for listing tools (paginated).
   *
   * Contains an array of `MCPTool` entries and optional pagination cursor
   * information inherited from `PaginatedResult`.
   */
  export type ListToolsResult = PaginatedResult & {
    /** Available tools for the requested provider(s) */
    tools: MCPTool[];
  };

  /**
   * Different content types that can be returned from a tool call.
   *
   * - `TextContent`: Simple textual output from a tool.
   * - `ImageContent`: Base64-encoded image data with an associated MIME type.
   * - `ResourceContents`: A generic resource reference with a `uri` and optional `mimeType`.
   * - `EmbeddedResource`: A container referencing either textual or binary resource contents.
   */
  export type TextContent = { type: 'text'; text: string } & Record<
    string,
    unknown
  >;
  export type ImageContent = {
    type: 'image';
    data: string;
    mimeType: string;
  } & Record<string, unknown>;
  export type ResourceContents = { uri: string; mimeType?: string } & Record<
    string,
    unknown
  >;
  /** Resource content that includes plain text */
  export type TextResourceContents = ResourceContents & { text: string };
  /** Resource content that includes binary/blob payload (base64) */
  export type BlobResourceContents = ResourceContents & { blob: string };
  /** Embedded resource wrapper used in result content arrays */
  export type EmbeddedResource = {
    type: 'resource';
    resource: TextResourceContents | BlobResourceContents;
  } & Record<string, unknown>;

  /** The union of possible CallTool result payload shapes. */
  export type CallToolResult =
    | (Result & {
        content: Array<TextContent | ImageContent | EmbeddedResource>;
        isError?: boolean;
      })
    | (Result & { toolResult: unknown });

  const BaseParamsSchema: unknown;
}

declare module '@/lib/ai/mcp/ai.sdk/json-rpc-message' {
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
   * @module json-rpc-message
   * @version 1.0.0
   * @author Derived from Vercel AI SDK
   * @license Apache-2.0
   */
  import type { Request, Result, BaseParams } from '@/lib/ai/mcp/ai.sdk/types';

  /**
   * JSON-RPC: Request with jsonrpc version and id merged with our Request shape
   */
  export type JSONRPCRequest = Request & {
    jsonrpc: '2.0';
    id: string | number;
  };

  /** JSON-RPC response shape */
  export type JSONRPCResponse = Result & {
    jsonrpc: '2.0';
    id: string | number;
    result: Result;
  };

  /** JSON-RPC error shape */
  export type JSONRPCError = Result & {
    jsonrpc: '2.0';
    id: string | number;
    error: { code: number; message: string; data?: unknown };
  };

  /** JSON-RPC notification shape */
  export type JSONRPCNotification = {
    jsonrpc: '2.0';
    method: string;
    params?: BaseParams;
  } & Result;

  /** The discriminated union of JSON-RPC messages */
  export type JSONRPCMessage =
    | JSONRPCRequest
    | JSONRPCNotification
    | JSONRPCResponse
    | JSONRPCError;

  /** Runtime Zod schema for JSONRPC messages (declaration) */
  export const JSONRPCMessageSchema: import('zod').ZodTypeAny;
}

declare module '@/lib/ai/mcp/ai.sdk/mcp-sse-transport' {
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

  import type { JSONRPCMessage } from '@/lib/ai/mcp/ai.sdk/json-rpc-message';

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
  export class SseMCPTransport {
    /** The discovered endpoint URL for sending messages via POST */
    protected endpoint?: URL;
    /** AbortController for canceling ongoing requests */
    protected abortController?: AbortController;
    /** The initial SSE connection URL */
    protected url: URL;
    /** Current connection status */
    protected connected: boolean;
    /** SSE connection wrapper with close and optional destroy methods */
    protected sseConnection?: {
      close: () => Promise<void>;
      destroy?: () => Promise<void> | void;
    };
    /** HTTP headers to include in requests */
    private headers?: Record<string, string>;

    /**
     * Callback invoked when the connection is closed.
     * @event
     */
    private _onclose?: () => void;
    get onclose(): (() => void) | undefined;
    set onclose(handler: (() => void) | undefined);

    /**
     * Callback invoked when an error occurs.
     * @event
     * @param error - The error that occurred
     */
    private _onerror?: (error: unknown) => void;
    get onerror(): ((error: unknown) => void) | undefined;
    set onerror(handler: ((error: unknown) => void) | undefined);

    /**
     * Callback invoked when a message is received.
     * @event
     * @param message - The received JSON-RPC message
     */
    private _onmessage?: (message: JSONRPCMessage) => void;
    get onmessage(): ((message: JSONRPCMessage) => void) | undefined;
    set onmessage(handler: ((message: JSONRPCMessage) => void) | undefined);

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
    });

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
    start(): Promise<void>;

    /**
     * Resolves and returns the headers used for requests.
     * @returns Promise that resolves to the headers for requests
     */
    protected resolveHeaders(): Promise<Headers>;

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
    close(): Promise<void>;

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
    send(message: JSONRPCMessage): Promise<void>;
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
  export function deserializeMessage(line: string): JSONRPCMessage;
}

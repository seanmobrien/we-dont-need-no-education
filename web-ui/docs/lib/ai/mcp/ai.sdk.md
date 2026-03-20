# lib/ai/mcp/ai.sdk — MCP SSE Transport (Declarations)

> Generated documentation based on JSDoc in `lib/ai/mcp/ai.sdk/index.d.ts`.

## Overview

This module provides types and declaration-only documentation for the MCP (Model Context Protocol) SSE transport and related data shapes. The runtime implementation lives under `lib/ai/mcp/ai.sdk` (see `./types.ts`, `mcp-sse-transport.ts`, and `json-rpc-message.ts`).

Much of this code is derived from Vercel's AI SDK and is redistributed under the Apache‑2.0 license. See the license and attribution in the `License` section below.

---

## Constants

### `LATEST_PROTOCOL_VERSION: string`

The most recent protocol version implemented by this transport.

### `SUPPORTED_PROTOCOL_VERSIONS: readonly string[]`

List of supported protocol version strings, includes `LATEST_PROTOCOL_VERSION`.

---

## Core Shapes

### `Configuration`

Metadata shape describing a client or server implementation:

- `name: string`
- `version: string`
- additional passthrough fields allowed

### `BaseParams`

Base parameter bag used by requests and results:

- `_meta?: Record<string, unknown>`
- passthrough additional keys allowed

### `Result`

Alias for `BaseParams` used as a generic result shape.

### `Request`

Shape for MCP requests:

- `method: string`
- `params?: BaseParams`

### `RequestOptions`

Request control options:

- `signal?: AbortSignal`
- `timeout?: number`
- `maxTotalTimeout?: number`

### `Notification`

Alias for `Request` used for notifications.

### `ServerCapabilities`

Describes server feature flags and capabilities. Many fields are optional and passthrough objects are allowed for forward compatibility. Useful fields include `prompts`, `resources`, `tools`, and `experimental`.

### `InitializeResult`

Return structure from server initialization:

- `protocolVersion: string`
- `capabilities: ServerCapabilities`
- `serverInfo: Configuration`
- `instructions?: string`

---

## Pagination

- `PaginatedRequest` — `Request` extended with optional `params.cursor` string for pagination.
- `PaginatedResult` — `Result` extended with optional `nextCursor`.

---

## Tool Descriptions

### `MCPTool`

Describes a single tool:

- `name: string`
- `description?: string`
- `inputSchema?: { type: 'object'; properties?: Record<string, unknown>; ... }`

### `ListToolsResult`

Paginated result containing `tools: MCPTool[]`.

---

## Call results

- `TextContent` — `{ type: 'text'; text: string }`
- `ImageContent` — `{ type: 'image'; data: string; mimeType: string }`
- `ResourceContents` — `{ uri: string; mimeType?: string }`
- `TextResourceContents` — `ResourceContents & { text: string }`
- `BlobResourceContents` — `ResourceContents & { blob: string }`
- `EmbeddedResource` — `{ type: 'resource'; resource: TextResourceContents | BlobResourceContents }`

### `CallToolResult`

Union type describing the result of calling a tool. Either a `Result` with `content` (array of text/image/resource content) or a `Result` with an opaque `toolResult`.

---

## JSON-RPC Types

The module defines JSON-RPC message shapes used by the SSE transport.

- `JSONRPCRequest` — `Request` augmented with `jsonrpc: '2.0'` and `id: string | number`.
- `JSONRPCResponse` — `Result` augmented with `jsonrpc: '2.0'`, `id`, and `result: Result`.
- `JSONRPCError` — `Result` shape with `error: { code: number; message: string; data?: unknown }`.
- `JSONRPCNotification` — Notification shaped with `jsonrpc: '2.0'` and a `method`.
- `JSONRPCMessage` — Union of the above.

Additionally the runtime exports `JSONRPCMessageSchema` (a `zod` schema) which is declared as `ZodTypeAny` in the declarations.

---

## SseMCPTransport API (High level)

The `SseMCPTransport` class implements an SSE-based transport with the following API surface (declaration-only):

Constructor:

```
constructor({ url, headers }: { url: string; headers?: Record<string,string> })
```

Properties and event callbacks (getters/setters):

- `onclose: (() => void) | undefined` — called when the transport closes
- `onerror: ((error: unknown) => void) | undefined` — called on errors
- `onmessage: ((message: JSONRPCMessage) => void) | undefined` — called for incoming JSON-RPC messages

Methods:

- `start(): Promise<void>` — establishes SSE connection and waits for endpoint discovery
- `resolveHeaders(): Promise<Headers>` — protected helper returning request headers (adds Accept: text/event-stream)
- `close(): Promise<void>` — closes the transport, aborts in-flight requests, triggers `onclose`
- `send(message: JSONRPCMessage): Promise<void>` — sends a JSON-RPC message by HTTP POST to the discovered endpoint

Helper:

- `deserializeMessage(line: string): JSONRPCMessage` — parses and validates a JSON string as a JSON-RPC message. Marked deprecated; prefer direct schema validation.

### Usage Example

```ts
const transport = new SseMCPTransport({
  url: 'https://api.example.com/mcp/sse',
  headers: { Authorization: 'Bearer token' },
});

transport.onmessage = (message) => console.log('Received', message);
transport.onerror = (err) => console.error('Transport error', err);

await transport.start();
await transport.send({ jsonrpc: '2.0', method: 'tools/list', id: 1 });
```

---

## Examples and patterns

- The transport discovers a POST endpoint via an `endpoint` SSE event. After the endpoint is discovered and validated (origin check), outgoing messages are sent to that POST URL.
- Use `resolveHeaders()` to centrally add headers and the required `Accept: text/event-stream` header for SSE.
- The transport uses `AbortController` to cancel requests; call `close()` during shutdown.

---

## License & Attribution

This module and its implementation are derived from Vercel's AI SDK. The original source is available at:

https://github.com/vercel/ai/blob/ai%404.3.16/packages/ai/core/tool/mcp/mcp-sse-transport.ts

Licensed under the Apache License, Version 2.0. See the source for the full license header and terms.

---

## Where to look in the code

- Implementation: `lib/ai/mcp/ai.sdk/mcp-sse-transport.ts`
- JSON-RPC schema: `lib/ai/mcp/ai.sdk/json-rpc-message.ts`
- Types and runtime schemas: `lib/ai/mcp/ai.sdk/types.ts`
- Declarations: `lib/ai/mcp/ai.sdk/index.d.ts`

---

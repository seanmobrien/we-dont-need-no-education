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

import { z } from 'zod';
import { BaseParamsSchema, RequestSchema, ResultSchema } from './types';

const JSONRPC_VERSION = '2.0';

const JSONRPCRequestSchema = z
  .object({
    jsonrpc: z.literal(JSONRPC_VERSION),
    id: z.union([z.string(), z.number().int()]),
  })
  .merge(RequestSchema)
  .strict();

export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>;

const JSONRPCResponseSchema = z
  .object({
    jsonrpc: z.literal(JSONRPC_VERSION),
    id: z.union([z.string(), z.number().int()]),
    result: ResultSchema,
  })
  .strict();

export type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>;

const JSONRPCErrorSchema = z
  .object({
    jsonrpc: z.literal(JSONRPC_VERSION),
    id: z.union([z.string(), z.number().int()]),
    error: z.object({
      code: z.number().int(),
      message: z.string(),
      data: z.optional(z.unknown()),
    }),
  })
  .strict();

export type JSONRPCError = z.infer<typeof JSONRPCErrorSchema>;

const JSONRPCNotificationSchema = z
  .object({
    jsonrpc: z.literal(JSONRPC_VERSION),
  })
  .merge(
    z.object({
      method: z.string(),
      params: z.optional(BaseParamsSchema),
    }),
  )
  .strict();

export type JSONRPCNotification = z.infer<typeof JSONRPCNotificationSchema>;

export const JSONRPCMessageSchema = z.union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResponseSchema,
  JSONRPCErrorSchema,
]);

export type JSONRPCMessage = z.infer<typeof JSONRPCMessageSchema>;

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
 * @module mcp-sse-transport
 * @version 1.0.0
 * @author Derived from Vercel AI SDK
 * @license Apache-2.0
 */

import { z } from 'zod';
import { Tool, ToolExecutionOptions } from 'ai';
import { inferParameters, ToolParameters } from './tool';

export const LATEST_PROTOCOL_VERSION = '2024-11-05';
export const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  '2024-10-07',
];

export type ToolSchemas =
  | Record<string, { parameters: ToolParameters }>
  | 'automatic'
  | undefined;

export type McpToolSet<TOOL_SCHEMAS extends ToolSchemas = 'automatic'> =
  TOOL_SCHEMAS extends Record<string, { parameters: ToolParameters }>
    ? {
        [K in keyof TOOL_SCHEMAS]: Tool<
          TOOL_SCHEMAS[K]['parameters'],
          CallToolResult
        > & {
          execute: (
            args: inferParameters<TOOL_SCHEMAS[K]['parameters']>,
            options: ToolExecutionOptions,
          ) => PromiseLike<CallToolResult>;
        };
      }
    : {
        [k: string]: Tool<z.ZodUnknown, CallToolResult> & {
          execute: (
            args: unknown,
            options: ToolExecutionOptions,
          ) => PromiseLike<CallToolResult>;
        };
      };

const ClientOrServerImplementationSchema = z
  .object({
    name: z.string(),
    version: z.string(),
  })
  .passthrough();
export type Configuration = z.infer<typeof ClientOrServerImplementationSchema>;

export const BaseParamsSchema = z
  .object({
    _meta: z.optional(z.object({}).passthrough()),
  })
  .passthrough();
type BaseParams = z.infer<typeof BaseParamsSchema>;
export const ResultSchema = BaseParamsSchema;

export const RequestSchema = z.object({
  method: z.string(),
  params: z.optional(BaseParamsSchema),
});
export type Request = z.infer<typeof RequestSchema>;
export type RequestOptions = {
  signal?: AbortSignal;
  timeout?: number;
  maxTotalTimeout?: number;
};

export type Notification = z.infer<typeof RequestSchema>;

const ServerCapabilitiesSchema = z
  .object({
    experimental: z.optional(z.object({}).passthrough()),
    logging: z.optional(z.object({}).passthrough()),
    prompts: z.optional(
      z
        .object({
          listChanged: z.optional(z.boolean()),
        })
        .passthrough(),
    ),
    resources: z.optional(
      z
        .object({
          subscribe: z.optional(z.boolean()),
          listChanged: z.optional(z.boolean()),
        })
        .passthrough(),
    ),
    tools: z.optional(
      z
        .object({
          listChanged: z.optional(z.boolean()),
        })
        .passthrough(),
    ),
  })
  .passthrough();
export type ServerCapabilities = z.infer<typeof ServerCapabilitiesSchema>;

export const InitializeResultSchema = ResultSchema.extend({
  protocolVersion: z.string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ClientOrServerImplementationSchema,
  instructions: z.optional(z.string()),
});
export type InitializeResult = z.infer<typeof InitializeResultSchema>;

export type PaginatedRequest = Request & {
  params?: BaseParams & {
    cursor?: string;
  };
};

const PaginatedResultSchema = ResultSchema.extend({
  nextCursor: z.optional(z.string()),
});

const ToolSchema = z
  .object({
    name: z.string(),
    description: z.optional(z.string()),
    inputSchema: z
      .object({
        type: z.literal('object'),
        properties: z.optional(z.object({}).passthrough()),
      })
      .passthrough(),
  })
  .passthrough();
export type MCPTool = z.infer<typeof ToolSchema>;
export const ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: z.array(ToolSchema),
});
export type ListToolsResult = z.infer<typeof ListToolsResultSchema>;

const TextContentSchema = z
  .object({
    type: z.literal('text'),
    text: z.string(),
  })
  .passthrough();
const ImageContentSchema = z
  .object({
    type: z.literal('image'),
    data: z.string().base64(),
    mimeType: z.string(),
  })
  .passthrough();
const ResourceContentsSchema = z
  .object({
    /**
     * The URI of this resource.
     */
    uri: z.string(),
    /**
     * The MIME type of this resource, if known.
     */
    mimeType: z.optional(z.string()),
  })
  .passthrough();
const TextResourceContentsSchema = ResourceContentsSchema.extend({
  text: z.string(),
});
const BlobResourceContentsSchema = ResourceContentsSchema.extend({
  blob: z.string().base64(),
});
const EmbeddedResourceSchema = z
  .object({
    type: z.literal('resource'),
    resource: z.union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  })
  .passthrough();

export const CallToolResultSchema = ResultSchema.extend({
  content: z.array(
    z.union([TextContentSchema, ImageContentSchema, EmbeddedResourceSchema]),
  ),
  isError: z.boolean().default(false).optional(),
}).or(
  ResultSchema.extend({
    toolResult: z.unknown(),
  }),
);
export type CallToolResult = z.infer<typeof CallToolResultSchema>;

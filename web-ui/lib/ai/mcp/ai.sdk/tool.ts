/* eslint-disable @typescript-eslint/no-explicit-any */
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
 * Originated from https://github.com/vercel/ai/blob/ai%404.3.16/packages/ai/core/tool/tool.ts
 *
 * @module mcp-sse-transport
 * @version 1.0.0
 * @author Derived from Vercel AI SDK
 * @license Apache-2.0
 */
import { Schema } from '@ai-sdk/ui-utils';
import { z } from 'zod';
import { CoreMessage } from 'ai';
import { ToolResultContent } from './tool-result-content';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolParameters = z.ZodTypeAny | Schema<any>;
export type inferParameters<PARAMETERS extends ToolParameters> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PARAMETERS extends Schema<any>
    ? PARAMETERS['_type']
    : PARAMETERS extends z.ZodTypeAny
      ? z.infer<PARAMETERS>
      : never;

export interface ToolExecutionOptions {
  /**
   * The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.
   */
  toolCallId: string;

  /**
   * Messages that were sent to the language model to initiate the response that contained the tool call.
   * The messages **do not** include the system prompt nor the assistant response that contained the tool call.
   */
  messages: CoreMessage[];

  /**
   * An optional abort signal that indicates that the overall operation should be aborted.
   */
  abortSignal?: AbortSignal;
}

/**
A tool contains the description and the schema of the input that the tool expects.
This enables the language model to generate the input.

The tool can also contain an optional execute function for the actual execution function of the tool.
 */
export type Tool<PARAMETERS extends ToolParameters = any, RESULT = any> = {
  /**
The schema of the input that the tool expects. The language model will use this to generate the input.
It is also used to validate the output of the language model.
Use descriptions to make the input understandable for the language model.
   */
  parameters: PARAMETERS;

  /**
An optional description of what the tool does.
Will be used by the language model to decide whether to use the tool.
Not used for provider-defined tools.
   */
  description?: string;

  /**
Optional conversion function that maps the tool result to multi-part tool content for LLMs.
   */
  experimental_toToolResultContent?: (result: RESULT) => ToolResultContent;

  /**
An async function that is called with the arguments from the tool call and produces a result.
If not provided, the tool will not be executed automatically.

@args is the input of the tool call.
@options.abortSignal is a signal that can be used to abort the tool call.
   */
  execute?: (
    args: inferParameters<PARAMETERS>,
    options: ToolExecutionOptions,
  ) => PromiseLike<RESULT>;
} & (
  | {
      /**
Function tool.
       */
      type?: undefined | 'function';
    }
  | {
      /**
Provider-defined tool.
       */
      type: 'provider-defined';

      /**
The ID of the tool. Should follow the format `<provider-name>.<tool-name>`.
       */
      id: `${string}.${string}`;

      /**
The arguments for configuring the tool. Must match the expected arguments defined by the provider for this tool.
       */
      args: Record<string, unknown>;
    }
);

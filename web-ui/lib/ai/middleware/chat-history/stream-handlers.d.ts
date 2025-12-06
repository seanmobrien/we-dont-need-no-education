/**
 * @fileoverview Stream Chunk Handlers for Chat History Middleware.
 *
 * This module provides utility functions for handling different types of streaming chunks
 * in the chat history middleware. Each handler is responsible for processing a specific
 * type of stream chunk and updating the database accordingly.
 */

import type {
  LanguageModelV2StreamPart,
  LanguageModelV2ToolCall,
  LanguageModelV2ToolResultPart,
} from '@ai-sdk/provider';
import type { StreamHandlerContext, StreamHandlerResult } from './types';

declare module '@/lib/ai/middleware/chat-history/stream-handlers' {
  /**
   * Handles tool-call stream chunks by creating new tool message records.
   *
   * This function processes tool call chunks from the AI model, creating new
   * message records in the database to track tool invocations and their parameters.
   * Each tool call gets its own message with a complete status.
   *
   * @param chunk - The tool-call stream chunk.
   * @param context - The current stream handler context.
   * @returns {Promise<StreamHandlerResult>} Promise resolving to the updated context and success status.
   */
  export const handleToolCall: (
    chunk: Extract<LanguageModelV2ToolCall, { type: 'tool-call' }>,
    context: StreamHandlerContext,
  ) => Promise<StreamHandlerResult>;

  /**
   * Handles tool-result stream chunks by updating the originating tool call
   * message with the tool's output and any provider metadata, and by setting
   * error status on the turn when appropriate.
   *
   * @param chunk - Tool result part emitted by the provider.
   * @param context - Current stream handler context.
   * @returns {Promise<StreamHandlerResult>} A `StreamHandlerResult` indicating success and updated fields.
   */
  export const handleToolResult: (
    chunk: LanguageModelV2ToolResultPart,
    context: StreamHandlerContext,
  ) => Promise<StreamHandlerResult>;

  /**
   * Handles finish stream chunks by recording token usage statistics.
   *
   * This function processes the final chunk from the AI model stream, recording
   * token usage statistics including prompt tokens, completion tokens, and total
   * token count for billing and analytics purposes.
   *
   * @param chunk - The finish stream chunk.
   * @param context - The current stream handler context.
   * @returns {Promise<StreamHandlerResult>} Promise resolving to the updated context and success status.
   */
  export function handleFinish(
    chunk: Extract<LanguageModelV2StreamPart, { type: 'finish' }>,
    context: StreamHandlerContext,
  ): Promise<StreamHandlerResult>;

  /**
   * Main dispatcher function that routes stream chunks to appropriate handlers.
   *
   * This function acts as a central dispatcher, examining the chunk type and
   * routing it to the appropriate specialized handler function. It provides
   * a unified interface for processing all types of stream chunks.
   *
   * @param chunk - The stream chunk to process.
   * @param context - The current stream handler context.
   * @returns {Promise<StreamHandlerResult>} Promise resolving to the updated context and success status.
   */
  export function processStreamChunk(
    chunk: LanguageModelV2StreamPart | LanguageModelV2ToolResultPart,
    context: StreamHandlerContext,
  ): Promise<StreamHandlerResult>;
}

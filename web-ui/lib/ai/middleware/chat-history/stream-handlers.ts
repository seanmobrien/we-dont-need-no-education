/**
 * @fileoverview Stream Chunk Handlers for Chat History Middleware
 * 
 * This module provides utility functions for handling different types of streaming chunks
 * in the chat history middleware. Each handler is responsible for processing a specific
 * type of stream chunk and updating the database accordingly.
 * 
 * @module lib/ai/middleware/chat-history/stream-handlers
 * @version 1.0.0
 * @since 2025-07-17
 */

import type { LanguageModelV1StreamPart } from 'ai';
import { chatMessages, tokenUsage } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { getNextSequence } from './utility';
import { StreamHandlerContext, StreamHandlerResult } from './types';


/**
 * Handles text-delta stream chunks by accumulating text and updating the assistant message.
 * 
 * This function processes incremental text updates from the AI model, accumulating
 * the text content and updating the corresponding message in the database with
 * the current accumulated text and streaming status.
 * 
 * @param chunk - The text-delta stream chunk
 * @param context - The current stream handler context
 * @returns Promise resolving to the updated context and success status
 * 
 * @example
 * ```typescript
 * const result = await handleTextDelta(
 *   { type: 'text-delta', textDelta: 'Hello ' },
 *   { 
 *     chatId: 'chat-123', 
 *     turnId: 1, 
 *     messageId: 42,
 *     currentMessageOrder: 1,
 *     generatedText: ''
 *   }
 * );
 * console.log(result.generatedText); // 'Hello '
 * ```
 */
export async function handleTextDelta(
  chunk: Extract<LanguageModelV1StreamPart, { type: 'text-delta' }>,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> {
  try {
    const updatedText = context.generatedText + chunk.textDelta;

    // Update the assistant message with accumulated text
    if (context.messageId) {
      await db
        .update(chatMessages)
        .set({
          content: updatedText,
          statusId: 1, // still streaming
        })
        .where(eq(chatMessages.messageId, context.messageId));
    }

    return {
      currentMessageOrder: context.currentMessageOrder,
      generatedText: updatedText,
      success: true,
    };
  } catch (error) {
    log((l) =>
      l.error('Error handling text-delta chunk', {
        error,
        turnId: context.turnId,
        chatId: context.chatId,
        textDelta: chunk.textDelta,
      }),
    );

    return {
      currentMessageOrder: context.currentMessageOrder,
      generatedText: context.generatedText,
      success: false,
    };
  }
}

/**
 * Handles tool-call stream chunks by creating new tool message records.
 * 
 * This function processes tool call chunks from the AI model, creating new
 * message records in the database to track tool invocations and their parameters.
 * Each tool call gets its own message with a complete status.
 * 
 * @param chunk - The tool-call stream chunk
 * @param context - The current stream handler context
 * @returns Promise resolving to the updated context and success status
 * 
 * @example
 * ```typescript
 * const result = await handleToolCall(
 *   { 
 *     type: 'tool-call', 
 *     toolName: 'search', 
 *     args: { query: 'example' }
 *   },
 *   { 
 *     chatId: 'chat-123', 
 *     turnId: 1,
 *     currentMessageOrder: 2,
 *     generatedText: 'Hello'
 *   }
 * );
 * console.log(result.currentMessageOrder); // 3
 * ```
 */
export async function handleToolCall(
  chunk: Extract<LanguageModelV1StreamPart, { type: 'tool-call' }>,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> {
  try {
    // Generate next message ID for the tool call
    const nextMessageId = await getNextSequence({
      tableName: 'chat_messages',
      chatId: context.chatId,
      turnId: context.turnId,
      count: 1,
    }).then((ids) => ids[0]);

    // Save tool call message
    await db.insert(chatMessages).values({
      chatId: context.chatId,
      turnId: context.turnId,
      role: 'tool',
      messageId: nextMessageId,
      toolName: chunk.toolName,
      functionCall: chunk.args,
      messageOrder: context.currentMessageOrder,
      statusId: 2, // complete status for tool calls
    });

    return {
      currentMessageOrder: context.currentMessageOrder + 1,
      generatedText: context.generatedText,
      success: true,
    };
  } catch (error) {
    log((l) =>
      l.error('Error handling tool-call chunk', {
        error,
        turnId: context.turnId,
        chatId: context.chatId,
        toolName: chunk.toolName,
        args: chunk.args,
      }),
    );

    return {
      currentMessageOrder: context.currentMessageOrder,
      generatedText: context.generatedText,
      success: false,
    };
  }
}

/**
 * Handles finish stream chunks by recording token usage statistics.
 * 
 * This function processes the final chunk from the AI model stream, recording
 * token usage statistics including prompt tokens, completion tokens, and total
 * token count for billing and analytics purposes.
 * 
 * @param chunk - The finish stream chunk
 * @param context - The current stream handler context
 * @returns Promise resolving to the updated context and success status
 * 
 * @example
 * ```typescript
 * const result = await handleFinish(
 *   { 
 *     type: 'finish', 
 *     usage: { 
 *       promptTokens: 50, 
 *       completionTokens: 25 
 *     }
 *   },
 *   { 
 *     chatId: 'chat-123', 
 *     turnId: 1,
 *     currentMessageOrder: 3,
 *     generatedText: 'Hello world'
 *   }
 * );
 * console.log(result.success); // true
 * ```
 */
export async function handleFinish(
  chunk: Extract<LanguageModelV1StreamPart, { type: 'finish' }>,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> {
  try {
    // Save token usage if available
    if (chunk.usage && context.turnId && (
      chunk.usage.promptTokens > 0 ||
      chunk.usage.completionTokens > 0
    )) {
      await db.insert(tokenUsage).values({
        chatId: context.chatId,
        turnId: context.turnId,
        promptTokens: chunk.usage.promptTokens,
        completionTokens: chunk.usage.completionTokens,
        totalTokens:
          chunk.usage.promptTokens + chunk.usage.completionTokens,
      });
    }

    return {
      currentMessageOrder: context.currentMessageOrder,
      generatedText: context.generatedText,
      success: true,
    };
  } catch (error) {
    log((l) =>
      l.error('Error handling finish chunk', {
        error,
        turnId: context.turnId,
        chatId: context.chatId,
        usage: chunk.usage,
      }),
    );

    return {
      currentMessageOrder: context.currentMessageOrder,
      generatedText: context.generatedText,
      success: false,
    };
  }
}

/**
 * Main dispatcher function that routes stream chunks to appropriate handlers.
 * 
 * This function acts as a central dispatcher, examining the chunk type and
 * routing it to the appropriate specialized handler function. It provides
 * a unified interface for processing all types of stream chunks.
 * 
 * @param chunk - The stream chunk to process
 * @param context - The current stream handler context
 * @returns Promise resolving to the updated context and success status
 * 
 * @example
 * ```typescript
 * const result = await processStreamChunk(chunk, context);
 * if (result.success) {
 *   // Update context with new values
 *   context.currentMessageOrder = result.currentMessageOrder;
 *   context.generatedText = result.generatedText;
 * }
 * ```
 */
export async function processStreamChunk(
  chunk: LanguageModelV1StreamPart,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> {
  switch (chunk.type) {
    case 'text-delta':
      return handleTextDelta(chunk, context);
    
    case 'tool-call':
      return handleToolCall(chunk, context);
    
    case 'finish':
      return handleFinish(chunk, context);
    
    default:
      // For unhandled chunk types, just return the current context unchanged
      return {
        currentMessageOrder: context.currentMessageOrder,
        generatedText: context.generatedText,
        success: true,
      };
  }
}

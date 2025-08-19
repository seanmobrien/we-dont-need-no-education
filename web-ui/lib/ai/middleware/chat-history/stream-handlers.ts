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
import { chatMessages, chatTurns, tokenUsage } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { ChatMessagesType, DbTransactionType, drizDb } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { getNextSequence } from './utility';
import type { StreamHandlerContext, StreamHandlerResult } from './types';
import type { LanguageModelV1ToolResultPart } from '../../types'
import { instrumentStreamChunk } from './instrumentation';
import { insertPendingAssistantMessage, reserveMessageIds } from './import-incoming-message';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

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
    if(!chunk.textDelta) {
      return {
        toolCalls: context.toolCalls,
        currentMessageOrder: context.currentMessageOrder,
        currentMessageId: context.messageId,
        generatedText: updatedText,
        success: true,
      };
    }
    let {
      messageId: currentMessageId,
      currentMessageOrder,
    } = context;
    // Update the assistant message with accumulated text
    if (currentMessageId) {
      await drizDb()
        .update(chatMessages)
        .set({
          content: JSON.stringify([{ type: 'text', text: updatedText }]),
        })
        .where(
          and(
            eq(chatMessages.chatId, context.chatId),
            eq(chatMessages.turnId, context.turnId),        
            eq(chatMessages.messageId, currentMessageId),
          ),
        );          
    } else {      
      await drizDb().transaction(async (tx) => {
        // Reserve message ID for pending assistant response
        const [messageId] = await reserveMessageIds(
          tx,
          context.chatId,
          context.turnId,
          1,
        );
        await insertPendingAssistantMessage(
          tx,
          context.chatId,
          context.turnId,
          messageId,
          currentMessageOrder,
          updatedText
            ? JSON.stringify([{ type: 'text', text: updatedText }])
            : '',
        );
        currentMessageOrder++;
        currentMessageId = messageId;
      });
    }
    return {
      toolCalls: context.toolCalls,
      currentMessageId,
      currentMessageOrder,
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
      toolCalls: context.toolCalls,
      currentMessageId: context.messageId,
      currentMessageOrder: context.currentMessageOrder,
      generatedText: context.generatedText,
      success: false,
    };
  }
}

const completePendingMessage = async ({ tx, messageId, chatId, turnId } : { tx: DbTransactionType, messageId: number | undefined, chatId: string, turnId: number }) => {
  if (messageId) {
    // Close out next message
    await tx.update(chatMessages)
      .set({
        // content: JSON.stringify([{'type': 'text', 'text': generatedText}]),
        statusId: 2,
      })
      .where(
        and(
          eq(chatMessages.chatId, chatId),
          eq(chatMessages.turnId, turnId),
          eq(chatMessages.messageId, messageId),
        ),
      );
    return true;
  }
  return false;
};

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
export const handleToolCall = async (
  chunk: Extract<LanguageModelV1StreamPart, { type: 'tool-call' }>,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> => {
  try {
    const { chatId, turnId, generatedText, messageId, currentMessageOrder, toolCalls } =
      context;
    await drizDb().transaction(async (tx) => {
      await completePendingMessage({ tx, messageId, chatId, turnId });
      // Generate next message ID for the tool call
      const nextMessageId = await getNextSequence({
        tx,
        tableName: 'chat_messages',
        chatId,
        turnId,
        count: 1,
      }).then((ids) => ids[0]);
      const toolCall = (await tx.insert(chatMessages).values({
        chatId,
        turnId,
        role: 'tool',
        content: generatedText,
        messageId: nextMessageId,
        providerId: chunk.toolCallId,
        toolName: chunk.toolName,
        functionCall: chunk.args,
        messageOrder: currentMessageOrder,
        statusId: 1, // complete status for tool calls
      })
      .returning()
      .execute())
      .at(0);
      if (toolCall) {
        if (!toolCall.providerId) {
          log(l => l.warn('Tool call was not assigned a provider id, result resolution may fail.', toolCall))
        }
        toolCalls.set(toolCall.providerId ?? '[missing]', toolCall);
      } else {
        log((l) =>
          l.error('Failed to create tool call message', {
            log: true,
            data: {
              chatId,
              turnId,
              toolName: chunk.toolName,
              args: chunk.args,
              generatedText,
            },
          }),
        );        
      }      
    });

    return {
      currentMessageId: undefined,
      currentMessageOrder: currentMessageOrder + 1,
      generatedText: '',
      toolCalls: toolCalls,
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
      toolCalls: context.toolCalls,
      currentMessageId: context.messageId,
      currentMessageOrder: context.currentMessageOrder,
      generatedText: context.generatedText,
      success: false,
    };
  }
};

const findPendingToolCall = async({ 
  chunk: { toolCallId, toolName }, 
  toolCalls,
  chatId,
  tx 
} : {  
  chunk: LanguageModelV1ToolResultPart;
  toolCalls: Map<string, ChatMessagesType>;
  chatId: string;
  tx: DbTransactionType;
}) => {
    let pendingCall = toolCalls.get(toolCallId)
    ?? await tx
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.chatId, chatId),
          eq(chatMessages.providerId, toolCallId),
        ),
      )
      .limit(1)
      .execute()
      .then(x => x.at(0));
  if (!pendingCall) {
    const maybeMatch = toolCalls.get('[missing]');
    if (maybeMatch && maybeMatch.toolName === toolName) {
      pendingCall = maybeMatch;
      pendingCall.providerId = toolCallId;
      toolCalls.set(pendingCall.providerId, pendingCall);
      toolCalls.delete('[missing]');
    }
  }
  return pendingCall;
};

const setTurnError = async ({
  tx,
  chatId,
  turnId,
  chunk
}: {
  tx: DbTransactionType;
  chatId: string;
  turnId: number;
  chunk: LanguageModelV1ToolResultPart
}) => {
  try{
    const turn = await tx.select({
      errors: chatTurns.errors,
      statusId: chatTurns.statusId,
    })
    .from(chatTurns)
    .where(and(
        eq(chatTurns.chatId, chatId),
        eq(chatTurns.turnId, turnId),
      ))
    .limit(1)
    .execute()
    .then(x => x.at(0));
  if (!turn) {
    log((l) => l.warn('Turn not found when saving tool result', { chatId, turnId }));
    return;
  }
  await tx.update(chatTurns).set({
    errors: [
      ...(turn.errors ? Array.from(turn.errors) : []),
      JSON.stringify(chunk.content)
    ],
    statusId: 3,
  }).where(
    and(
      eq(chatTurns.chatId, chatId),
      eq(chatTurns.turnId, turnId),
    )
  );
  } catch(error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error,{
      log: true,
      data: {
        chatId,
        turnId,
        toolName: chunk.toolName,
        providerId: chunk.toolCallId
      },
      message: 'Error setting turn error from tool result',
    });
  }
};


export const handleToolResult = async (
  chunk: LanguageModelV1ToolResultPart,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> => {
  try {
    const {
      chatId,
      turnId,
      generatedText,
      messageId,
      currentMessageOrder,
      toolCalls,
    } = context;
    await drizDb().transaction(async (tx) => {
      await completePendingMessage({ tx, messageId, chatId, turnId });
      // Match against a pending tool call
      const pendingCall = await findPendingToolCall({ chatId, toolCalls, chunk, tx });
      if (pendingCall) {
        const metadata: Record<PropertyKey, unknown> = pendingCall.metadata ? { ...pendingCall.metadata } : {};
        let statusId = 2;
        if (chunk.isError === true){
          statusId = 3;
          metadata.toolErrorResult = chunk.content;
          await setTurnError({ tx, chatId, turnId, chunk });
        } 
        if (chunk.providerMetadata) {
          metadata.toolResultProviderMeta = chunk.providerMetadata;
        }        
        await tx.update(chatMessages).set({
          statusId,
          toolResult: !!chunk.result ? JSON.stringify(chunk.result) : null,
          metadata: metadata,
          content: `${pendingCall.content ?? ''}\n${generatedText}`,
        }).where(
          and(
            eq(chatMessages.chatId, chatId),
            eq(chatMessages.turnId, turnId),
            eq(chatMessages.messageId, pendingCall.messageId),
          ),
        );
      } else {
        log((l) =>
          l.warn('No pending tool call found for chunk', {
            chatId,
            turnId,
            toolName: chunk.toolName,
            providerId: chunk.toolCallId
          }),
        );
      }
    });

    return {
      currentMessageId: undefined,
      currentMessageOrder: currentMessageOrder,
      generatedText: '',
      toolCalls: toolCalls,
      success: true,
    };
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      data: {
        chatId: context.chatId,
        turnId: context.turnId,
        toolName: chunk.toolName,
        providerId: chunk.toolCallId
      },
      message: 'Error handling tool-result chunk',
    });
    return {
      toolCalls: context.toolCalls,
      currentMessageId: context.messageId,
      currentMessageOrder: context.currentMessageOrder,
      generatedText: context.generatedText,
      success: false,
    };
  }
};




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
    if (chunk.usage && context.turnId && ((
      chunk.usage.promptTokens > 0 ||
      chunk.usage.completionTokens > 0
    ) || context.messageId)) {
      await drizDb().transaction(async (tx) => {
        if (context.messageId) {
          await tx.update(chatMessages).set({
            statusId: 2,
          }).where(
            and(
              eq(chatMessages.chatId, context.chatId),
              eq(chatMessages.turnId, context.turnId),
              eq(chatMessages.messageId, context.messageId),
            ),
          );
        }
        await tx.insert(tokenUsage).values({
          chatId: context.chatId,
          turnId: context.turnId,
          promptTokens: chunk.usage.promptTokens,
          completionTokens: chunk.usage.completionTokens,
          totalTokens:
            chunk.usage.promptTokens + chunk.usage.completionTokens,
        });
      });
    }

    return {
      toolCalls: context.toolCalls,
      currentMessageOrder: context.currentMessageOrder,
      generatedText: context.generatedText,
      currentMessageId: undefined,
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
      toolCalls: context.toolCalls,
      currentMessageOrder: context.currentMessageOrder,
      currentMessageId: context.messageId,
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
  chunk: LanguageModelV1StreamPart | LanguageModelV1ToolResultPart,
  context: StreamHandlerContext,
): Promise<StreamHandlerResult> {
  return await instrumentStreamChunk(chunk.type, context, async () => {
    switch (chunk.type) {
      case 'text-delta':
        return await handleTextDelta(chunk, context);

      case 'tool-call':
        return await handleToolCall(chunk, context);

      case 'tool-result':
        return await handleToolResult(chunk, context);

      case 'finish':
        return await handleFinish(chunk, context);

      default:
        // For unhandled chunk types, just return the current context unchanged
        return {
          ...context,
          generatedText: context.generatedText + JSON.stringify(chunk),
          currentMessageId: context.messageId,
          success: true,
        };
    }
  });
}

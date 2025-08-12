/**
 * @fileoverview Flush Handlers for Chat History Middleware
 * 
 * This module provides utility functions for handling the completion of chat turns,
 * including finalizing messages, updating turn status, generating chat titles,
 * and handling error scenarios during the flush operation.
 * 
 * @module lib/ai/middleware/chat-history/flush-handlers
 * @version 1.0.0
 * @since 2025-07-17
 */

import { chats, chatTurns, chatMessages } from '@/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { drizDb } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import type { FlushContext, FlushResult, FlushConfig } from './types';
import { instrumentFlushOperation } from './instrumentation';
import { insertPendingAssistantMessage, reserveTurnId } from './import-incoming-message';
import { LoggedError } from '@/lib/react-util/errors/logged-error';

/**
 * Default configuration for flush operations.
 */
const DEFAULT_FLUSH_CONFIG: FlushConfig = {
  autoGenerateTitle: true,
  maxTitleLength: 100,
  titleWordCount: 6,
};

/**
 * Finalizes the assistant message by updating its content and marking it as complete.
 * 
 * This function updates the assistant message with the final accumulated text
 * and changes its status from "streaming" to "complete".
 * 
 * @param context - The flush context containing message details
 * @returns Promise that resolves when message is finalized
 * 
 * @example
 * ```typescript
 * await finalizeAssistantMessage({
 *   chatId: 'chat-123',
 *   turnId: 1,
 *   messageId: 42,
 *   generatedText: 'Hello, how can I help you?',
 *   startTime: Date.now()
 * });
 * ```
 */
export async function finalizeAssistantMessage(context: FlushContext): Promise<void> {
  try{
    if (!context.messageId) {
      if (!context.generatedText?.trim()) {
        log((l) =>
          l.warn('No pending message to finalize', {
            chatId: context.chatId,
            turnId: context.turnId,
          }),
        );
        return;
      }    
      await drizDb().transaction(async tx => {    
        let thisTurnId = context.turnId;
        if (!thisTurnId) {
          thisTurnId = await reserveTurnId(tx, context.chatId);
          context.turnId = thisTurnId;
        }    
        await insertPendingAssistantMessage(
          tx,
          context.chatId,
          thisTurnId,
          0,
          0,
          context.generatedText,
          2
        );
      });
      return;      
    }

    await drizDb()
      .update(chatMessages)
      .set(context.generatedText ? {
        content: JSON.stringify([{type: 'text', text: context.generatedText}]),
        statusId: 2, // complete status
      } : {
        statusId: 2, // complete status
      })
      .where(
        and(
          eq(chatMessages.chatId, context.chatId),
          eq(chatMessages.turnId, context.turnId!),
          eq(chatMessages.messageId, context.messageId),
        ),
      );

    log((l) =>
      l.debug('Assistant message finalized', {
        chatId: context.chatId,
        turnId: context.turnId,
        messageId: context.messageId,
        textLength: context.generatedText.length,
      }),
    );
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      message: 'Error finalizing assistant message',
      data: {
        chatId: context.chatId,
        turnId: context.turnId,
        messageId: context.messageId,
      },
    });
  }
}

/**
 * Completes the chat turn by updating its status and recording performance metrics.
 * 
 * This function marks the turn as complete, records the completion timestamp,
 * and calculates the total latency for the turn.
 * 
 * @param context - The flush context containing turn details
 * @param latencyMs - The calculated latency in milliseconds
 * @returns Promise that resolves when turn is completed
 * 
 * @example
 * ```typescript
 * await completeChatTurn(context, 1250); // 1.25 seconds
 * ```
 */
export async function completeChatTurn(
  context: FlushContext,
  latencyMs: number,
): Promise<void> {
  if (!context.turnId) {
    log((l) =>
      l.warn('No turn ID provided for completion', {
        chatId: context.chatId,
      }),
    );
    return;
  }

  try {
    await drizDb()
      .update(chatTurns)
      .set({
        statusId: 2, // complete status
        completedAt: new Date().toISOString(),
        latencyMs,
      })
      .where(
        and(
          eq(chatTurns.chatId, context.chatId),
          eq(chatTurns.turnId, context.turnId),
        ),
      );

    log((l) =>
      l.debug('Chat turn completed', {
        chatId: context.chatId,
        turnId: context.turnId,
        latencyMs,
      }),
    );
  } catch (error) {
    throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      message: 'Failed to complete chat turn',
      data: {
        chatId: context.chatId,
        turnId: context.turnId,
      },
    });
  }
}

/**
 * Generates and sets a chat title if one doesn't exist.
 * 
 * This function automatically generates a title for new chats based on the
 * first few words of the generated response. It only runs if the chat
 * doesn't already have a title.
 * 
 * @param context - The flush context containing chat details
 * @param config - Configuration for title generation
 * @returns Promise that resolves when title is set (or skipped)
 * 
 * @example
 * ```typescript
 * await generateChatTitle(context, {
 *   autoGenerateTitle: true,
 *   maxTitleLength: 100,
 *   titleWordCount: 6
 * });
 * ```
 */
export async function generateChatTitle(
  context: FlushContext,
  config: FlushConfig = DEFAULT_FLUSH_CONFIG,
): Promise<void> {
  if (!config.autoGenerateTitle || !context.generatedText) {
    return;
  }

  try {
    // Check if chat already has a title
    const existingTitle = await drizDb().query.chats.findFirst({
      where: eq(chats.id, context.chatId),
      columns: { title: true },
    });

    if (existingTitle?.title) {
      log((l) =>
        l.debug('Chat already has title, skipping generation', {
          chatId: context.chatId,
          existingTitle: existingTitle.title,
        }),
      );
      return;
    }

    // Generate title from first few words
    const words = context.generatedText.split(' ').slice(0, config.titleWordCount);
    const title = words.join(' ').substring(0, config.maxTitleLength);

    if (title.trim()) {
      await drizDb()
        .update(chats)
        .set({ title })
        .where(eq(chats.id, context.chatId));

      log((l) =>
        l.debug('Generated chat title', {
          chatId: context.chatId,
          title,
          wordCount: words.length,
        }),
      );
    }
  } catch (error) {
    // Title generation is non-critical; log structured error but do not throw.
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      message: 'Failed to generate chat title',
      data: {
        chatId: context.chatId,
      },
    });
  }
}

/**
 * Marks a chat turn as failed due to an error during processing.
 * 
 * This function updates the turn status to "error", records the completion time,
 * and stores the error message for debugging purposes.
 * 
 * @param context - The flush context containing turn details
 * @param error - The error that caused the turn to fail
 * @returns Promise that resolves when turn is marked as failed
 * 
 * @example
 * ```typescript
 * await markTurnAsError(context, new Error('Database connection failed'));
 * ```
 */
export async function markTurnAsError(
  context: FlushContext,
  error: Error,
): Promise<void> {
  if (!context.turnId) {
    log((l) =>
      l.warn('No turn ID provided for error marking', {
        chatId: context.chatId,
        error: error.message,
      }),
    );
    return;
  }

  try {
    await drizDb()
      .update(chatTurns)
      .set({
        statusId: 3, // error status
        completedAt: new Date().toISOString(),
        errors: [error.message],
      })
      .where(
        and(
          eq(chatTurns.chatId, context.chatId),
          eq(chatTurns.turnId, context.turnId),
        ),
      );

    log((l) =>
      l.info('Turn marked as error', {
        chatId: context.chatId,
        turnId: context.turnId,
        error: error.message,
      }),
    );
  } catch (updateError) {
    LoggedError.isTurtlesAllTheWayDownBaby(updateError, {
      log: true,
      message: 'Failed to mark turn as error',
      data: {
        originalError: error.message,
        chatId: context.chatId,
        turnId: context.turnId,
      },
    });
    // Don't throw - already in an error state
  }
}

/**
 * Main flush handler that orchestrates the completion of a chat turn.
 * 
 * This function coordinates all the steps needed to properly complete a chat turn:
 * 1. Finalizes the assistant message
 * 2. Completes the turn with performance metrics
 * 3. Generates a chat title if needed
 * 4. Logs completion details
 * 
 * @param context - The flush context containing all necessary details
 * @param config - Optional configuration for flush behavior
 * @returns Promise resolving to the flush result
 * 
 * @example
 * ```typescript
 * const result = await handleFlush({
 *   chatId: 'chat-123',
 *   turnId: 1,
 *   messageId: 42,
 *   generatedText: 'Hello, how can I help you?',
 *   startTime: Date.now() - 1250
 * });
 * 
 * if (result.success) {
 *   console.log(`Turn completed in ${result.latencyMs}ms`);
 * }
 * ```
 */
export async function handleFlush(
  context: FlushContext,
  config: FlushConfig = DEFAULT_FLUSH_CONFIG,
): Promise<FlushResult> {
  return await instrumentFlushOperation(context, async () => {
    const startFlush = Date.now();
    const processingTimeMs = startFlush - context.startTime;

    try {
      // Step 1: Finalize the assistant message
      await finalizeAssistantMessage(context);

      // Step 2: Complete the turn with metrics
      await completeChatTurn(context, processingTimeMs);

      // Step 3: Generate chat title if needed
      await generateChatTitle(context, config);

      // Step 4: Log successful completion
      log((l) =>
        l.info('Chat turn completed successfully', {
          chatId: context.chatId,
          turnId: context.turnId,
          processingTimeMs,
          generatedTextLength: context.generatedText.length,
          flushDurationMs: Date.now() - startFlush,
        }),
      );

      return {
        success: true,
        processingTimeMs,
        textLength: context.generatedText.length,
      };
    } catch (error) {
      const flushError = LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Error during flush operation',
        data: {
          chatId: context.chatId,
          turnId: context.turnId,
        },
      });

      // Attempt to mark turn as error (best-effort)
      await markTurnAsError(context, flushError);

      return {
        success: false,
        processingTimeMs,
        textLength: context.generatedText.length,
        error: flushError,
      };
    }
  });
}

/**
 * Export default configuration for external use.
 */
export { DEFAULT_FLUSH_CONFIG };

/**
 * @fileoverview Message Persistence Utilities for Chat History Middleware
 * 
 * This module provides shared utilities for handling message persistence across
 * both streaming and text completion modes in the chat history middleware.
 * 
 * @module lib/ai/middleware/chat-history/message-persistence
 * @version 1.0.0
 * @since 2025-07-25
 */

import { LanguageModelV1CallOptions } from 'ai';
import { drizDb } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import type { ChatHistoryContext, FlushContext, MessageCompletionContext, MessagePersistenceInit } from './types';
import { importIncomingMessage } from './import-incoming-message';
import { handleFlush } from './flush-handlers';
import { instrumentMiddlewareInit, createChatHistoryError } from './instrumentation';

/**
 * Initializes message persistence by creating chat, turn, and message records.
 * This is used by both streaming and text completion modes.
 * 
 * @param context - The chat history context
 * @param params - The language model call parameters
 * @returns Promise resolving to the initialized persistence data
 * 
 * @example
 * ```typescript
 * const { chatId, turnId, messageId } = await initializeMessagePersistence(
 *   context,
 *   params
 * );
 * ```
 */
export const initializeMessagePersistence = async (
  context: ChatHistoryContext,
  params: LanguageModelV1CallOptions,
): Promise<MessagePersistenceInit> => {
  try {
    return await drizDb().transaction(async (tx) => 
      importIncomingMessage({
        tx,
        context,
        params,
      })
    );
  } catch (error) {
    // Create enhanced error for better observability
    const enhancedError = createChatHistoryError(
      'Error initializing message persistence',
      { 
        chatId: context.chatId || 'unknown',
        turnId: undefined,
        messageId: undefined 
      },
      error instanceof Error ? error : new Error(String(error))
    );

    LoggedError.isTurtlesAllTheWayDownBaby(enhancedError, {
      log: true,
      source: 'MessagePersistence',
      message: 'Error initializing message persistence',
      critical: true,
      data: {
        context,
        userId: context.userId,
        chatId: context.chatId,
      }
    });
    throw enhancedError;
  }
};

/**
 * Completes message persistence by finalizing the message and turn.
 * This is used by both streaming and text completion modes.
 * 
 * @param completionContext - The context for completing the message
 * @returns Promise resolving to the flush result
 * 
 * @example
 * ```typescript
 * const result = await completeMessagePersistence({
 *   chatId: 'chat-123',
 *   turnId: 1,
 *   messageId: 42,
 *   generatedText: 'Generated response text',
 *   startTime: Date.now() - 1000
 * });
 * ```
 */
export const completeMessagePersistence = async (
  completionContext: MessageCompletionContext,
) => {
  try {
    // Create flush context for the completion
    const flushContext: FlushContext = {
      chatId: completionContext.chatId,
      turnId: completionContext.turnId,
      messageId: completionContext.messageId,
      generatedText: completionContext.generatedText,
      startTime: completionContext.startTime,
    };

    // Handle completion using the existing flush logic
    const flushResult = await handleFlush(flushContext);

    if (!flushResult.success && flushResult.error) {
      log((l) =>
        l.error('Error completing message persistence', {
          error: flushResult.error,
          turnId: completionContext.turnId,
          chatId: completionContext.chatId,
        }),
      );
    } else {
      log((l) =>
        l.debug('Message persistence completed successfully', {
          chatId: completionContext.chatId,
          turnId: completionContext.turnId,
          messageId: completionContext.messageId,
          textLength: completionContext.generatedText.length,

          processingTimeMs: flushResult.processingTimeMs,
        }),
      );
    }

    return flushResult;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'MessagePersistence',
      message: 'Error completing message persistence',
      critical: true,
      data: {
        chatId: completionContext.chatId,
        turnId: completionContext.turnId,
        messageId: completionContext.messageId,
      }
    });
    throw error;
  }
};

/**
 * Safely handles message persistence initialization with error handling.
 * Returns null if initialization fails to allow continued operation.
 * 
 * @param context - The chat history context
 * @param params - The language model call parameters
 * @returns Promise resolving to initialization data or null if failed
 */
export const safeInitializeMessagePersistence = async (
  context: ChatHistoryContext,
  params: LanguageModelV1CallOptions,
): Promise<MessagePersistenceInit | null> => {
  try {
    return await instrumentMiddlewareInit(context, async () => {
      return await initializeMessagePersistence(context, params);
    });
  } catch {
    // Error already logged in initializeMessagePersistence and instrumentation
    return null;
  }
};

/**
 * Safely handles message persistence completion with error handling.
 * Logs errors but doesn't throw to avoid breaking the response flow.
 * 
 * @param completionContext - The context for completing the message
 * @returns Promise resolving to flush result or a failure result
 */
export const safeCompleteMessagePersistence = async (
  completionContext: MessageCompletionContext,
) => {
  try {
    return await completeMessagePersistence(completionContext);
  } catch {
    // Error already logged in completeMessagePersistence
    // Return a failure result instead of throwing
    return {
      success: false,
      processingTimeMs: Date.now() - completionContext.startTime,
      textLength: completionContext.generatedText.length,
      error: new Error('Message persistence completion failed'),
    };
  }
};
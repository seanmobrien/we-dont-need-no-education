/**
 * @fileoverview Message Persistence Utilities for Chat History Middleware.
 *
 * This module provides shared utilities for handling message persistence across
 * both streaming and text completion modes in the chat history middleware.
 */

import type { LanguageModelV2CallOptions } from '@ai-sdk/provider';
import type {
  ChatHistoryContext,
  FlushResult,
  MessageCompletionContext,
  MessagePersistenceInit,
} from './types';

declare module '@/lib/ai/middleware/chat-history/message-persistence' {
  /**
   * Initializes message persistence by creating chat, turn, and message records.
   * This is used by both streaming and text completion modes.
   *
   * @param context - The chat history context.
   * @param params - The language model call parameters.
   * @returns {Promise<MessagePersistenceInit>} Promise resolving to the initialized persistence data.
   */
  export const initializeMessagePersistence: (
    context: ChatHistoryContext,
    params: LanguageModelV2CallOptions,
  ) => Promise<MessagePersistenceInit>;

  /**
   * Completes message persistence by finalizing the message and turn.
   * This is used by both streaming and text completion modes.
   *
   * @param completionContext - The context for completing the message.
   * @returns {Promise<FlushResult>} Promise resolving to the flush result.
   */
  export const completeMessagePersistence: (
    completionContext: MessageCompletionContext,
  ) => Promise<FlushResult>;

  /**
   * Safely handles message persistence initialization with error handling.
   * Returns null if initialization fails to allow continued operation.
   *
   * @param context - The chat history context.
   * @param params - The language model call parameters.
   * @returns {Promise<MessagePersistenceInit | null>} Promise resolving to initialization data or null if failed.
   */
  export const safeInitializeMessagePersistence: (
    context: ChatHistoryContext,
    params: LanguageModelV2CallOptions,
  ) => Promise<MessagePersistenceInit | null>;

  /**
   * Safely handles message persistence completion with error handling.
   * Logs errors but doesn't throw to avoid breaking the response flow.
   *
   * @param completionContext - The context for completing the message.
   * @returns {Promise<FlushResult | { success: false; processingTimeMs: number; textLength: number; error: Error }>} Promise resolving to flush result or a failure result.
   */
  export const safeCompleteMessagePersistence: (
    completionContext: MessageCompletionContext,
  ) => Promise<
    | FlushResult
    | {
        success: false;
        processingTimeMs: number;
        textLength: number;
        error: Error;
      }
  >;
}

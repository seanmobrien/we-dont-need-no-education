/**
 * @fileoverview Chat Message Import and Processing System.
 *
 * This module provides functionality for importing and persisting incoming chat messages
 * within the AI middleware pipeline. It handles the complete lifecycle of message ingestion,
 * from chat session management to message sequencing and database persistence.
 */

import type { DbTransactionType } from '../../../drizzle-db';
import { ChatHistoryContext } from './types';
import type { LanguageModelV2CallOptions } from '@ai-sdk/provider';

declare module '@/lib/ai/middleware/chat-history/import-incoming-message' {
  /**
   * Ensures a chat session exists in the database, creating it if necessary.
   * Implements an idempotent upsert operation for chat sessions.
   *
   * @param tx - Active database transaction for consistency.
   * @param chatId - The normalized chat ID to upsert.
   * @param context - Chat context containing user and model information.
   * @returns {Promise<void>} Promise that resolves when the upsert operation completes.
   */
  export const upsertChat: (
    tx: DbTransactionType,
    chatId: string,
    context: ChatHistoryContext,
  ) => Promise<void>;

  /**
   * Reserves a unique turn ID for a new conversation turn.
   * Generates and reserves a sequential turn identifier within a chat session.
   *
   * @param tx - Active database transaction for consistency.
   * @param chatId - The chat ID to generate a turn for.
   * @returns {Promise<number>} Promise resolving to the reserved turn ID.
   */
  export const reserveTurnId: (
    tx: DbTransactionType,
    chatId: string,
  ) => Promise<number>;

  /**
   * Creates a new chat turn record with comprehensive metadata.
   * Initializes a new conversation turn in the database with all necessary tracking information.
   *
   * @param tx - Active database transaction for consistency.
   * @param chatId - The chat ID this turn belongs to.
   * @param turnId - The unique turn identifier.
   * @param context - Chat context containing model and request information.
   * @returns {Promise<void>} Promise that resolves when the turn record is created.
   */
  export const insertChatTurn: (
    tx: DbTransactionType,
    chatId: string,
    turnId: number | undefined,
    context: ChatHistoryContext,
  ) => Promise<void>;

  /**
   * Reserves a batch of sequential message IDs for efficient insertion.
   * Pre-allocates a contiguous range of message IDs to ensure proper ordering.
   *
   * @param tx - Active database transaction for consistency.
   * @param chatId - The chat ID these messages belong to.
   * @param turnId - The turn ID these messages belong to.
   * @param count - Number of message IDs to reserve.
   * @returns {Promise<number[]>} Promise resolving to array of reserved message IDs.
   */
  export const reserveMessageIds: (
    tx: DbTransactionType,
    chatId: string,
    turnId: number,
    count: number,
  ) => Promise<number[]>;

  /**
   * Inserts a pending assistant message row to begin streaming content.
   *
   * @param tx - Active transaction.
   * @param chatId - Chat identifier.
   * @param turnId - Turn identifier.
   * @param messageId - Pre-reserved message id.
   * @param messageOrder - Sequential order for the message.
   * @param content - Initial content payload.
   * @returns {Promise<void>} Promise that resolves when the message is inserted.
   */
  export const insertPendingAssistantMessage: (
    tx: DbTransactionType,
    chatId: string,
    turnId: number,
    messageId: number,
    messageOrder: number,
    content: string,
  ) => Promise<void>;

  /**
   * Upserts a tool message by providerId, implementing non-destructive merge.
   *
   * @param tx - Active database transaction.
   * @param chatId - The chat ID.
   * @param turnId - Current turn ID.
   * @param toolRow - The tool message row to upsert.
   * @returns {Promise<number | null>} Promise resolving to the messageId of the upserted record.
   */
  export const upsertToolMessage: (
    tx: DbTransactionType,
    chatId: string,
    turnId: number,
    toolRow: unknown, // Using any here as ChatMessageRowDraft is not exported or easily accessible
  ) => Promise<number | null>;

  /**
   * Imports and persists incoming chat messages within a transactional database context.
   * Orchestrates the complete process of message ingestion for AI chat applications.
   *
   * @param params - The import operation parameters.
   * @param params.tx - Active database transaction for consistency.
   * @param params.context - Chat context containing user, model, and session information.
   * @param params.params - Language model call options containing the message prompt.
   * @returns {Promise<{ chatId: string; turnId: number; messageId: number }>} Promise resolving to import result.
   */
  export const importIncomingMessage: (params: {
    tx: DbTransactionType;
    context: ChatHistoryContext;
    params: LanguageModelV2CallOptions;
  }) => Promise<{
    chatId: string;
    turnId: number;
    messageId: number;
  }>;
}

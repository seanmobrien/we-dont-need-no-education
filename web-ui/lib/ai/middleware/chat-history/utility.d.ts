/**
 * @fileoverview Utility functions for Chat History Middleware.
 *
 * This module provides helper functions for generating sequence IDs, normalizing output,
 * formatting tool results, and deduplicating incoming messages.
 */

import type {
  LanguageModelV2CallOptions,
  LanguageModelV2ToolResultPart,
} from '@ai-sdk/provider';
import { type DbTransactionType } from '../../../drizzle-db';
import { ToolStatus } from './types';

declare module '@/lib/ai/middleware/chat-history/utility' {
  /**
   * Generates the next sequence ID(s) for a given table and chat context.
   *
   * @param params - The parameters for generating the sequence ID.
   * @param params.chatId - The chat identifier.
   * @param params.tableName - The table name ('chat_turns' or 'chat_messages').
   * @param params.count - The number of IDs to generate (default: 1).
   * @param params.tx - Optional database transaction.
   * @param params.turnId - The turn identifier (required for 'chat_messages').
   * @returns {Promise<Array<number>>} A promise that resolves to an array of generated IDs.
   */
  export const getNextSequence: (params:
    | {
        chatId: string;
        tableName: 'chat_turns';
        count?: number;
        tx?: DbTransactionType;
      }
    | {
        chatId: string;
        tableName: 'chat_messages';
        turnId: number;
        count?: number;
        tx?: DbTransactionType;
      }) => Promise<Array<number>>;

  /**
   * Normalizes a value to a string representation.
   *
   * @param value - The value to normalize.
   * @returns {string} The normalized string.
   */
  export const normalizeOutput: (value: unknown) => string;

  /**
   * Formats a tool result item into a standardized status and output object.
   *
   * @param item - The tool result item or null/undefined.
   * @returns {{ status: ToolStatus; output?: string; media?: string }} The formatted output.
   */
  export const getItemOutput: (
    item:
      | (LanguageModelV2ToolResultPart & {
          type: 'tool-result' | 'dynamic-tool';
        })
      | null
      | undefined,
  ) => {
    status: ToolStatus;
    output?: string;
    media?: string;
  };

  /**
   * Filters incoming messages to exclude those that have already been persisted.
   *
   * This function checks against existing messages in the database to prevent
   * duplicates, handling both text and tool messages.
   *
   * @param tx - The database transaction.
   * @param chatId - The chat identifier.
   * @param incomingMessages - The list of incoming messages to filter.
   * @param currentTurnId - The current turn identifier (optional).
   * @returns {Promise<LanguageModelV2CallOptions['prompt']>} A promise that resolves to the filtered list of new messages.
   */
  export const getNewMessages: (
    tx: DbTransactionType,
    chatId: string,
    incomingMessages: LanguageModelV2CallOptions['prompt'],
    currentTurnId?: number,
  ) => Promise<LanguageModelV2CallOptions['prompt']>;
}

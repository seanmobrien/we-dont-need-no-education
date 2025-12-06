/**
 * @fileoverview Flush Handlers for Chat History Middleware.
 *
 * This module provides utility functions for handling the completion of chat turns,
 * including finalizing messages, updating turn status, generating chat titles,
 * and handling error scenarios during the flush operation.
 */

import type { FlushContext, FlushResult, FlushConfig } from './types';

declare module '@/lib/ai/middleware/chat-history/flush-handlers' {
  /**
   * Default configuration for flush operations.
   */
  export const DEFAULT_FLUSH_CONFIG: FlushConfig;

  /**
   * Finalizes the assistant message by updating its content and marking it as complete.
   *
   * This function updates the assistant message with the final accumulated text
   * and changes its status from "streaming" to "complete".
   *
   * @param context - The flush context containing message details.
   * @returns {Promise<void>} Promise that resolves when message is finalized.
   */
  export function finalizeAssistantMessage(
    context: FlushContext,
  ): Promise<void>;

  /**
   * Completes the chat turn by updating its status and recording performance metrics.
   *
   * This function marks the turn as complete, records the completion timestamp,
   * and calculates the total latency for the turn.
   *
   * @param context - The flush context containing turn details.
   * @param latencyMs - The calculated latency in milliseconds.
   * @returns {Promise<void>} Promise that resolves when turn is completed.
   */
  export function completeChatTurn(
    context: FlushContext,
    latencyMs: number,
  ): Promise<void>;

  /**
   * Generates and sets a chat title if one doesn't exist.
   *
   * This function automatically generates a title for new chats based on the
   * first few words of the generated response. It only runs if the chat
   * doesn't already have a title.
   *
   * @param context - The flush context containing chat details.
   * @param config - Configuration for title generation.
   * @returns {Promise<void>} Promise that resolves when title is set (or skipped).
   */
  export function generateChatTitle(
    context: FlushContext,
    config?: FlushConfig,
  ): Promise<void>;

  /**
   * Marks a chat turn as failed due to an error during processing.
   *
   * This function updates the turn status to "error", records the completion time,
   * and stores the error message for debugging purposes.
   *
   * @param context - The flush context containing turn details.
   * @param error - The error that caused the turn to fail.
   * @returns {Promise<void>} Promise that resolves when turn is marked as failed.
   */
  export function markTurnAsError(
    context: FlushContext,
    error: Error,
  ): Promise<void>;

  /**
   * Main flush handler that orchestrates the completion of a chat turn.
   *
   * This function coordinates all the steps needed to properly complete a chat turn:
   * 1. Finalizes the assistant message
   * 2. Completes the turn with performance metrics
   * 3. Generates a chat title if needed
   * 4. Logs completion details
   *
   * @param context - The flush context containing all necessary details.
   * @param config - Optional configuration for flush behavior.
   * @returns {Promise<FlushResult>} Promise resolving to the flush result.
   */
  export function handleFlush(
    context: FlushContext,
    config?: FlushConfig,
  ): Promise<FlushResult>;
}

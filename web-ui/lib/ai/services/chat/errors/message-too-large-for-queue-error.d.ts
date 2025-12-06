/**
 * @fileoverview MessageTooLargeForQueueError - Custom error for handling oversized chat messages
 *
 * This module provides a specialized error class for scenarios where chat messages exceed
 * the maximum token limits for AI language models. This is critical for managing costs,
 * preventing API failures, and ensuring optimal performance in AI chat applications.
 *
 * Different AI models have varying token limits:
 * - GPT-3.5-turbo: ~4,096 tokens
 * - GPT-4: ~8,192 tokens
 * - GPT-4-turbo: ~128,000 tokens
 * - Claude-3: ~200,000 tokens
 *
 * @module MessageTooLargeForQueueError
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * import { MessageTooLargeForQueueError } from './MessageTooLargeForQueueError';
 *
 * // Throwing the error
 * throw new MessageTooLargeForQueueError(5000, 4096, 'gpt-3.5-turbo');
 *
 * // Catching and handling the error
 * try {
 *   await processMessage(largeMessage);
 * } catch (error) {
 *   if (error instanceof MessageTooLargeForQueueError) {
 *     console.log(`Message too large: ${error.tokenCount}/${error.maxTokens} tokens`);
 *     // Handle by chunking, summarizing, or rejecting
 *   }
 * }
 * ```
 */

declare module '@/lib/ai/services/chat/errors/message-too-large-for-queue-error' {
  /**
   * Custom error thrown when a chat message exceeds the maximum token limit for a language model.
   *
   * This error provides detailed information about the size violation, including:
   * - The actual token count of the message
   * - The maximum allowed tokens for the model
   * - The specific model type that has the limit
   *
   * Common scenarios where this error occurs:
   * - User submits extremely long text input
   * - System attempts to process document that exceeds model capacity
   * - Conversation history grows beyond model's context window
   * - Prompt engineering results in oversized requests
   *
   * @class MessageTooLargeForQueueError
   * @extends Error
   *
   * @example
   * ```typescript
   * // Creating and throwing the error
   * const error = new MessageTooLargeForQueueError(10000, 8192, 'gpt-4');
   * throw error;
   *
   * // Accessing error properties
   * console.log(error.name);         // 'MessageTooLargeForQueueError'
   * console.log(error.tokenCount);   // 10000
   * console.log(error.maxTokens);    // 8192
   * console.log(error.modelType);    // 'gpt-4'
   * console.log(error.message);      // 'Message with 10000 tokens exceeds maximum allowed 8192 tokens for model gpt-4'
   * ```
   */
  export class MessageTooLargeForQueueError extends Error {
    /**
     * The name of the error class, always set to 'MessageTooLargeForQueueError'.
     * This property is useful for error identification, logging, and type guards.
     *
     * @readonly
     * @type {string}
     */
    public readonly name: string;

    /**
     * Creates a new MessageTooLargeForQueueError instance.
     *
     * @param tokenCount - The actual number of tokens in the message that exceeded the limit.
     *                    This count typically includes both input tokens and any system/context tokens.
     * @param maxTokens - The maximum number of tokens allowed for the specified model.
     *                   This limit is model-specific and may include both input and output token reserves.
     * @param modelType - The identifier or name of the AI model that has the token limit.
     *                   Should be a recognizable model name (e.g., 'gpt-4', 'claude-3-opus', 'gemini-pro').
     *
     * @example
     * ```typescript
     * // For GPT-4 with standard limit
     * const error1 = new MessageTooLargeForQueueError(10000, 8192, 'gpt-4');
     *
     * // For custom model with specific limits
     * const error2 = new MessageTooLargeForQueueError(150000, 128000, 'gpt-4-turbo');
     *
     * // For enterprise model with higher limits
     * const error3 = new MessageTooLargeForQueueError(250000, 200000, 'claude-3-opus');
     * ```
     */
    constructor(
      /**
       * The actual number of tokens in the oversized message.
       * This includes all tokens from the user input, system prompts, and conversation history.
       *
       * @readonly
       * @type {number}
       */
      tokenCount: number,

      /**
       * The maximum number of tokens allowed for the target model.
       * This represents the hard limit imposed by the AI service or internal constraints.
       *
       * @readonly
       * @type {number}
       */
      maxTokens: number,

      /**
       * The identifier of the AI model that has the token limitation.
       * Should be a clear, recognizable model name for debugging and routing purposes.
       *
       * @readonly
       * @type {string}
       */
      modelType: string,
    );

    /**
     * The actual number of tokens in the oversized message.
     * This includes all tokens from the user input, system prompts, and conversation history.
     *
     * @readonly
     * @type {number}
     */
    public readonly tokenCount: number;

    /**
     * The maximum number of tokens allowed for the target model.
     * This represents the hard limit imposed by the AI service or internal constraints.
     *
     * @readonly
     * @type {number}
     */
    public readonly maxTokens: number;

    /**
     * The identifier of the AI model that has the token limitation.
     * Should be a clear, recognizable model name for debugging and routing purposes.
     *
     * @readonly
     * @type {string}
     */
    public readonly modelType: string;
  }
}

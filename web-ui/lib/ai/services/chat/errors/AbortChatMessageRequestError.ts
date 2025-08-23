/**
 * @fileoverview AbortChatMessageRequestError - Custom error for handling aborted chat message requests
 * 
 * This module provides a specialized error class for scenarios where chat message requests
 * are intentionally aborted or cancelled. This is commonly used in AI chat applications
 * where users may cancel long-running requests or when the application needs to terminate
 * requests due to timeouts or other conditions.
 * 
 * @module AbortChatMessageRequestError
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * import { AbortChatMessageRequestError } from './AbortChatMessageRequestError';
 * 
 * // Throwing the error
 * throw new AbortChatMessageRequestError('req-123');
 * 
 * // Catching and handling the error
 * try {
 *   await sendChatMessage(message);
 * } catch (error) {
 *   if (error instanceof AbortChatMessageRequestError) {
 *     console.log(`Request ${error.requestId} was cancelled`);
 *   }
 * }
 * ```
 */

/**
 * Custom error thrown when a chat message request is aborted or cancelled.
 * 
 * This error is typically thrown in the following scenarios:
 * - User manually cancels a chat request
 * - Request times out and is automatically aborted
 * - System cancels request due to resource constraints
 * - Request is superseded by a newer request
 * 
 * @class AbortChatMessageRequestError
 * @extends Error
 * 
 * @example
 * ```typescript
 * // Creating and throwing the error
 * const error = new AbortChatMessageRequestError('chat-req-456');
 * throw error;
 * 
 * // Accessing error properties
 * console.log(error.name);        // 'AbortChatMessageRequestError'
 * console.log(error.message);     // 'Chat message request chat-req-456 was aborted'
 * console.log(error.requestId);   // 'chat-req-456'
 * ```
 */
export class AbortChatMessageRequestError extends Error {
  /**
   * The name of the error class, always set to 'AbortChatMessageRequestError'.
   * This property is useful for error identification and logging.
   * 
   * @readonly
   * @type {string}
   */
  public readonly name = 'AbortChatMessageRequestError';

  /**
   * Creates a new AbortChatMessageRequestError instance.
   * 
   * @param requestId - The unique identifier of the chat message request that was aborted.
   *                   This should be a meaningful identifier that can be used for tracking
   *                   and debugging purposes.
   * 
   * @example
   * ```typescript
   * // With a UUID-style request ID
   * const error1 = new AbortChatMessageRequestError('550e8400-e29b-41d4-a716-446655440000');
   * 
   * // With a custom request ID
   * const error2 = new AbortChatMessageRequestError('chat-session-123-msg-456');
   * 
   * // With a simple numeric ID
   * const error3 = new AbortChatMessageRequestError('12345');
   * ```
   */
  constructor(
    /**
     * The unique identifier of the aborted chat message request.
     * This identifier should be meaningful for debugging and request tracking.
     * 
     * @readonly
     * @type {string}
     */
    public readonly requestId: string
  ) {
    super(`Chat message request ${requestId} was aborted`);
    this.name = 'AbortChatMessageRequestError';
  }
}
/**
 * @fileoverview Core utilities and type guards for the react-util library.
 * @module core
 */

declare module 'lib/react-util/core' {
  import { AbortChatMessageRequestError } from '/lib/ai/services/chat/errors/abort-chat-message-request-error';
  import { MessageTooLargeForQueueError } from '/lib/ai/services/chat/errors/message-too-large-for-queue-error';

  export { isError, isRecord } from './utility-methods';
  export { LoggedError } from './errors/logged-error';

  /**
   * Type guard to check if a value is an AbortChatMessageRequestError.
   * Supports both instanceof checks and interface compatibility.
   *
   * @param value - The value to check.
   * @returns True if the value is an AbortChatMessageRequestError, false otherwise.
   *
   * @example
   * ```typescript
   * try {
   *   // some operation
   * } catch (error) {
   *   if (isAbortChatMessageRequestError(error)) {
   *     console.log(`Request ${error.requestId} was aborted`);
   *   }
   * }
   * ```
   */
  export function isAbortChatMessageRequestError(
    value: unknown,
  ): value is AbortChatMessageRequestError;

  /**
   * Type guard to check if a value is a MessageTooLargeForQueueError.
   * Supports both instanceof checks and interface compatibility.
   *
   * @param value - The value to check.
   * @returns True if the value is a MessageTooLargeForQueueError, false otherwise.
   *
   * @example
   * ```typescript
   * try {
   *   // some operation
   * } catch (error) {
   *   if (isMessageTooLargeForQueueError(error)) {
   *     console.log(`Message with ${error.tokenCount} tokens exceeds limit of ${error.maxTokens}`);
   *   }
   * }
   * ```
   */
  export function isMessageTooLargeForQueueError(
    value: unknown,
  ): value is MessageTooLargeForQueueError;
}

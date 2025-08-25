export { isError, isRecord } from './_utility-methods';
export { LoggedError } from './errors/logged-error';

// Import error types for type guards
import { AbortChatMessageRequestError } from '@/lib/ai/services/chat/errors/abort-chat-message-request-error';
import { MessageTooLargeForQueueError } from '@/lib/ai/services/chat/errors/message-too-large-for-queue-error';
import { isError } from './_utility-methods';

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
export function isAbortChatMessageRequestError(value: unknown): value is AbortChatMessageRequestError {
  // First check instanceof for exact type match
  if (value instanceof AbortChatMessageRequestError) {
    return true;
  }

  // Then check interface compatibility using duck typing
  return (
    isError(value) &&
    value.name === 'AbortChatMessageRequestError' &&
    'requestId' in value &&
    (typeof (value as Record<string, unknown>).requestId === 'string' || 
     (value as Record<string, unknown>).requestId === undefined)
  );
}

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
export function isMessageTooLargeForQueueError(value: unknown): value is MessageTooLargeForQueueError {
  // First check instanceof for exact type match
  if (value instanceof MessageTooLargeForQueueError) {
    return true;
  }

  // Then check interface compatibility using duck typing
  return (
    isError(value) &&
    value.name === 'MessageTooLargeForQueueError' &&
    'tokenCount' in value &&
    'maxTokens' in value &&
    'modelType' in value &&
    typeof (value as Record<string, unknown>).tokenCount === 'number' &&
    typeof (value as Record<string, unknown>).maxTokens === 'number' &&
    typeof (value as Record<string, unknown>).modelType === 'string'
  );
}

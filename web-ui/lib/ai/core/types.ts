import { AiModelType } from './unions';

export type * from './unions';

/**
 * Represents the base structure for an annotated message.
 *
 * @property type - The type of the message.
 * @property message - An optional human-readable message.
 * @property data - Optional additional data associated with the message.
 */

export type AnnotatedMessageBase = {
  type: string;
  message?: string;
  data?: unknown;
};
/**
 * Represents an annotated error message, extending the base annotated message.
 *
 * @property type - The fixed string literal 'error' indicating this is an error message.
 * @property data - An object containing details about the error.
 * @property data.reason - A string describing the reason for the error.
 * @property data.retryAfter - (Optional) The number of seconds to wait before retrying the operation.
 */
export type AnnotatedErrorMessage = AnnotatedMessageBase & {
  type: 'error';
  message?: string;
  data: {
    reason: string;
    retryAfter?: number;
  };
};
export type AnnotatedRetryMessage = AnnotatedMessageBase & {
  type: 'error';
  message: string;
  hint: 'notify:retry';
  data: {
    model: AiModelType;
    retryAt: string; // ISO 8601 format
  };
};

export type AnnotatedMessage =
  | AnnotatedErrorMessage
  | AnnotatedRetryMessage
  | AnnotatedMessageBase;

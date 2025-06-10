/**
 * @module ai/core/guards
 *
 * Provides type guard functions for validating annotated message types used in the AI core library.
 * Includes utilities to check if a value is an `AnnotatedMessageBase` or a specific `AnnotatedErrorMessage`.
 */
import { match, P } from 'ts-pattern';
import {
  AnnotatedErrorMessage,
  AnnotatedMessageBase,
  AnnotatedRetryMessage,
} from './types';
import { AiModelType, AiModelTypeValues, AiLanguageModelType } from './unions';

/**
 * Type guard to check if a given value is an `AnnotatedMessageBase`.
 *
 * @param message - The value to check.
 * @returns `true` if the value is an object with a string `type` property, otherwise `false`.
 */
export const isAnnotatedMessageBase = (
  message: unknown,
): message is AnnotatedMessageBase => {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof (message as AnnotatedMessageBase).type === 'string'
  );
};

/**
 * Type guard to check if a given `AnnotatedMessageBase` is an `AnnotatedErrorMessage`.
 *
 * @param message - The `AnnotatedMessageBase` to check.
 * @returns `true` if the message's `type` is `'error'`, otherwise `false`.
 */
export const isAnnotatedErrorMessage = (
  message: unknown,
): message is AnnotatedErrorMessage => {
  if (!isAnnotatedMessageBase(message)) {
    return false;
  }
  return message.type === 'error';
};

/**
 * Type guard that checks if the provided message is an `AnnotatedRetryMessage`.
 *
 * An `AnnotatedRetryMessage` is expected to have the following structure:
 * - `type`: must be the string `'error'`
 * - `hint`: must be the string `'notify:retry'`
 * - `message`: must be a string
 * - `data`: an object containing:
 *    - `model`: one of `'hifi'`, `'lofi'`, `'completions'`, or `'embedding'`
 *    - `retryAt`: a string matching the ISO 8601 date-time format
 *
 * @param message - The value to check.
 * @returns `true` if the message matches the `AnnotatedRetryMessage` structure, otherwise `false`.
 */
export const isAnnotatedRetryMessage = (
  message: unknown,
): message is AnnotatedRetryMessage =>
  match(message)
    .with(
      {
        type: 'error',
        hint: 'notify:retry',
        message: P.string,
        data: {
          model: P.union('hifi', 'lofi', 'completions', 'embedding'),
          retryAt: P.string.regex(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
          ),
        },
      },
      () => true,
    )
    .otherwise(() => false);

/**
 * Type guard to check if a given value is a valid `AiModelType`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a string and is included in `AiModelTypeValues`, otherwise `false`.
 */
export const isAiModelType = (value: unknown): value is AiModelType =>
  typeof value === 'string' && AiModelTypeValues.includes(value as AiModelType);

/**
 * Type guard that checks if a given value is an `AiModelType` excluding the `'embedding'` type.
 *
 * @param value - The value to check.
 * @returns `true` if the value is an `AiModelType` and not `'embedding'`; otherwise, `false`.
 *
 * @example
 * ```typescript
 * isAiLanguageModelType('hifi'); // true
 * isAiLanguageModelType('lofi'); // true
 * isAiLanguageModelType('embedding'); // false
 * isAiLanguageModelType('other-model'); // false
 * ```
 */
export const isAiLanguageModelType = (
  value: unknown,
): value is AiLanguageModelType =>
  isAiModelType(value) && value !== 'embedding';

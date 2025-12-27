import { AnnotatedErrorMessage, AnnotatedRetryMessage, AnnotatedErrorMessageBase } from './types';
import { AiModelType, AiLanguageModelType, AiProviderType } from './unions';
/**
 * Type guard to check if a given value is an `AnnotatedMessageBase`.
 *
 * @param message - The value to check.
 * @returns `true` if the value is an object with a string `type` property, otherwise `false`.
 */
export declare const isAnnotatedMessageBase: (message: unknown) => message is AnnotatedErrorMessageBase;
/**
 * Type guard to check if a given `AnnotatedMessageBase` is an `AnnotatedErrorMessage`.
 *
 * @param message - The `AnnotatedMessageBase` to check.
 * @returns `true` if the message's `type` is `'error'`, otherwise `false`.
 */
export declare const isAnnotatedErrorMessage: (message: unknown) => message is AnnotatedErrorMessage;
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
export declare const isAnnotatedRetryMessage: (message: unknown) => message is AnnotatedRetryMessage;
/**
 * Type guard to check if a given value is a valid `AiModelType`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a string and is included in `AiModelTypeValues`, otherwise `false`.
 */
export declare const isAiModelType: (value: unknown) => value is AiModelType;
/**
 * Type guard that checks if a given value is an `AiModelType` excluding the embedding types.
 *
 * @param value - The value to check.
 * @returns `true` if the value is an `AiModelType` and not `'embedding'` or `'google-embedding'`; otherwise, `false`.
 *
 * @example
 * ```typescript
 * isAiLanguageModelType('hifi'); // true
 * isAiLanguageModelType('lofi'); // true
 * isAiLanguageModelType('gemini-pro'); // true
 * isAiLanguageModelType('embedding'); // false
 * isAiLanguageModelType('google-embedding'); // false
 * isAiLanguageModelType('other-model'); // false
 * ```
 */
export declare const isAiLanguageModelType: (value: unknown) => value is AiLanguageModelType;
/**
 * Type guard to check if a given value is a valid `AiProviderType`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a valid `AiProviderType`, otherwise `false`.
 *
 * @example
 * ```typescript
 * isAiProviderType('azure'); // true
 * isAiProviderType('google'); // true
 * isAiProviderType('openai'); // true
 * isAiProviderType('other-provider'); // false
 * ```
 */
export declare const isAiProviderType: (value: unknown) => value is AiProviderType;
//# sourceMappingURL=guards.d.ts.map
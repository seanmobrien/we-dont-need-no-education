/**
 * @fileoverview Type guard declarations for AI core types.
 *
 * @module @compliance-theater/types/ai/core/guards
 *
 * Provides ambient type declarations for runtime type guard functions that validate
 * and narrow types for AI core message types, model identifiers, and provider types.
 * These guards enable safe runtime validation of dynamically-received or untyped data
 * at module boundaries (e.g., when parsing JSON, receiving data from external APIs).
 *
 * @remarks
 * All guards follow the TypeScript type predicate pattern: `(value: unknown): value is T`,
 * allowing consumers to use guards in conditional logic with automatic type narrowing.
 *
 * The guards are organized into three functional categories:
 * - **Annotated Message Validation**: Guards for discriminated union types representing
 *   structured error and retry messages used in AI communication.
 * - **Model Type Validation**: Guards for AI model identifiers (e.g., 'hifi', 'lofi',
 *   'gemini-pro') and language model variants excluding embedding models.
 * - **Provider Type Validation**: Guards for AI provider identifiers (e.g., 'azure',
 *   'google', 'openai').
 *
 * @example
 * ```typescript
 * import {
 *   isAnnotatedRetryMessage,
 *   isAiLanguageModelType,
 * } from '@compliance-theater/types/ai/core';
 *
 * // Validate and narrow message type
 * if (isAnnotatedRetryMessage(response)) {
 *   // response is typed as AnnotatedRetryMessage
 *   const retryTime = new Date(response.data.retryAt);
 *   await sleep(retryTime.getTime() - Date.now());
 * }
 *
 * // Validate and narrow model type
 * if (isAiLanguageModelType(modelId)) {
 *   // modelId is typed as AiLanguageModelType (excludes embedding models)
 *   setActiveLanguageModel(modelId);
 * }
 * ```
 *
 * @see {@link types} for the corresponding type definitions
 * @see {@link unions} for union type definitions and constant arrays used by guards
 */

import type {
  AnnotatedErrorMessageBase,
  AnnotatedErrorMessage,
  AnnotatedRetryMessage,
  AiModelType,
  AiLanguageModelType,
  AiProviderType,
} from "./types";

declare module "@compliance-theater/types/ai/core" {
  /**
   * Type guard to validate that a value is an `AnnotatedErrorMessageBase`.
   *
   * An `AnnotatedErrorMessageBase` is an object with a `type` property that is
   * either `'data-error-notify-retry'` or `'data-error-retry'`. These discriminated
   * types represent structured error messages used in AI service responses.
   *
   * Use this guard as a first-pass check before narrowing to more specific message types.
   *
   * @param message - The unknown value to validate.
   * @returns `true` if `message` is an object with a valid error message type property;
   *          otherwise `false`.
   *
   * @example
   * ```typescript
   * const response = await callAiService();
   *
   * if (isAnnotatedMessageBase(response)) {
   *   // response is now typed as AnnotatedErrorMessageBase
   *   // Can safely access response.type
   *   console.log(`Error type: ${response.type}`);
   * }
   * ```
   */
  export function isAnnotatedMessageBase(
    message: unknown
  ): message is AnnotatedErrorMessageBase;

  /**
   * Type guard to validate that a value is an `AnnotatedErrorMessage`.
   *
   * An `AnnotatedErrorMessage` represents a retry-capable error with the type
   * `'data-error-retry'`. It includes:
   * - `type`: `'data-error-retry'`
   * - `data.reason`: A descriptive string explaining the error.
   * - `data.retryAfter`: The number of seconds to wait before retrying.
   *
   * This guard is more specific than `isAnnotatedMessageBase` and performs
   * additional validation to ensure the message contains retry information.
   *
   * @param message - The unknown value to validate.
   * @returns `true` if `message` is a valid `AnnotatedErrorMessage`; otherwise `false`.
   *
   * @example
   * ```typescript
   * const error = await apiCall();
   *
   * if (isAnnotatedErrorMessage(error)) {
   *   // error is typed as AnnotatedErrorMessage
   *   console.log(`Error: ${error.data.reason}`);
   *   console.log(`Retry after: ${error.data.retryAfter}s`);
   *   setTimeout(() => retry(), error.data.retryAfter * 1000);
   * }
   * ```
   */
  export function isAnnotatedErrorMessage(
    message: unknown
  ): message is AnnotatedErrorMessage;

  /**
   * Type guard to validate that a value is an `AnnotatedRetryMessage`.
   *
   * An `AnnotatedRetryMessage` is a specific error notification that includes
   * information for retrying at a scheduled time. It must have:
   * - `type`: `'data-error-notify-retry'`
   * - `data.model`: One of the valid `AiModelType` values (e.g., 'hifi', 'lofi', 'google:hifi')
   * - `data.retryAt`: An ISO 8601 datetime string indicating when to retry
   *
   * This guard performs strict validation including regex matching on the ISO 8601
   * datetime format to ensure data integrity before runtime use.
   *
   * @param message - The unknown value to validate.
   * @returns `true` if `message` is a valid `AnnotatedRetryMessage` with properly
   *          formatted retry information; otherwise `false`.
   *
   * @example
   * ```typescript
   * const response = await callAiEndpoint();
   *
   * if (isAnnotatedRetryMessage(response)) {
   *   // response is typed as AnnotatedRetryMessage
   *   const retryTime = new Date(response.data.retryAt);
   *   const model = response.data.model; // AiModelType
   *   console.log(`Model ${model} will be available at ${retryTime.toISOString()}`);
   *   scheduleRetry(retryTime);
   * }
   * ```
   */
  export function isAnnotatedRetryMessage(
    message: unknown
  ): message is AnnotatedRetryMessage;

  /**
   * Type guard to validate that a value is a valid `AiModelType`.
   *
   * `AiModelType` encompasses all supported AI model identifiers, including:
   * - Low-fidelity models: `'lofi'`, `'google:lofi'`, `'azure:lofi'`
   * - High-fidelity models: `'hifi'`, `'google:hifi'`, `'azure:hifi'`
   * - Specialized models: `'gemini-pro'`, `'gemini-flash'`, `'google:gemini-2.0-flash'`
   * - Utility models: `'completions'`, `'embedding'`, and provider-specific variants
   *
   * This guard checks both type and membership in the `AiModelTypeValues` array,
   * ensuring the value is a recognized model identifier.
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` is a string matching a known `AiModelType`; otherwise `false`.
   *
   * @example
   * ```typescript
   * const modelId = getUserInput();
   *
   * if (isAiModelType(modelId)) {
   *   // modelId is typed as AiModelType
   *   const config = getModelConfig(modelId);
   *   initializeModel(config);
   * }
   * ```
   *
   * @see {@link isAiLanguageModelType} for excluding embedding-only models
   */
  export function isAiModelType(value: unknown): value is AiModelType;

  /**
   * Type guard to validate that a value is a valid `AiLanguageModelType`.
   *
   * `AiLanguageModelType` is a refinement of `AiModelType` that excludes embedding-only models:
   * - Excludes: `'embedding'`, `'google-embedding'`, `'azure:embedding'`, `'google:embedding'`
   * - Includes: All language models suitable for text generation and completion tasks
   *
   * Use this guard when you need to ensure a model is suitable for language generation
   * rather than vector embedding operations.
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` is an `AiModelType` excluding embedding-only variants;
   *          otherwise `false`.
   *
   * @example
   * ```typescript
   * const modelId = getSelectedModel();
   *
   * if (isAiLanguageModelType(modelId)) {
   *   // modelId is typed as AiLanguageModelType
   *   // Safe to call text generation methods
   *   const response = await generateText({
   *     model: modelId,
   *     prompt: userPrompt,
   *   });
   * } else if (isAiModelType(modelId)) {
   *   // modelId is an embedding model; use embedding-specific methods
   *   const embedding = await generateEmbedding({
   *     model: modelId,
   *     text: inputText,
   *   });
   * }
   * ```
   *
   * @see {@link isAiModelType} for the broader model type check
   */
  export function isAiLanguageModelType(
    value: unknown
  ): value is AiLanguageModelType;

  /**
   * Type guard to validate that a value is a valid `AiProviderType`.
   *
   * `AiProviderType` represents supported AI service providers:
   * - `'azure'` - Microsoft Azure OpenAI Service
   * - `'google'` - Google AI / Vertex AI
   * - `'openai'` - OpenAI API
   *
   * This guard checks string membership in the recognized provider list, ensuring
   * the value can be safely used for provider-specific configuration and routing.
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` is a recognized `AiProviderType`; otherwise `false`.
   *
   * @example
   * ```typescript
   * const providerId = config.aiProvider;
   *
   * if (isAiProviderType(providerId)) {
   *   // providerId is typed as AiProviderType
   *   const credentials = getProviderCredentials(providerId);
   *   initializeClient(providerId, credentials);
   * } else {
   *   throw new Error(`Unknown provider: ${providerId}`);
   * }
   * ```
   *
   * @see {@link AiProviderTypeValues} for the list of valid provider identifiers
   */
  export function isAiProviderType(
    value: unknown
  ): value is AiProviderType;
}

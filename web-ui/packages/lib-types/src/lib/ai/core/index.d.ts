/**
 * @fileoverview Main type and guard exports for AI core functionality.
 *
 * @module @compliance-theater/types/lib/ai/core
 *
 * Central hub for AI model identification, provider routing, and error/retry handling.
 * This module aggregates and re-exports type definitions, runtime constants, and
 * validation utilities for the core AI system.
 *
 * @remarks
 * **Module Organization**:
 * - **Types** (`types.d.ts`): Core message types and utility types
 * - **Unions** (`unions.d.ts`): Model and provider identifiers with constant arrays
 * - **Guards** (`guards.d.ts`): Runtime type validation and narrowing utilities
 *
 * This module is the primary import point for consumers who need AI type safety
 * and validation. For specialized use cases (e.g., only working with models or only
 * with error handling), consumers can import directly from submodules:
 *
 * ```typescript
 * // Default: import everything
 * import { AiModelType, isAiModelType } from '@compliance-theater/types/lib/ai/core';
 *
 * // Specialized: import only model types
 * import type { AiModelType } from '@compliance-theater/types/lib/ai/core/types';
 * import { AiModelTypeValues } from '@compliance-theater/types/lib/ai/core/unions';
 *
 * // Specialized: import only error types
 * import type { AnnotatedRetryMessage } from '@compliance-theater/types/lib/ai/core/types';
 * import { isAnnotatedRetryMessage } from '@compliance-theater/types/lib/ai/core/guards';
 * ```
 *
 * @example
 * ```typescript
 * import type {
 *   AiModelType,
 *   AiLanguageModelType,
 *   AnnotatedRetryMessage,
 * } from '@compliance-theater/types/lib/ai/core';
 * import {
 *   isAiLanguageModelType,
 *   isAnnotatedRetryMessage,
 *   AiModelTypeValues,
 * } from '@compliance-theater/types/lib/ai/core';
 *
 * // Exhaustive model configuration
 * const modelConfig = Object.fromEntries(
 *   AiModelTypeValues.map(model => [
 *     model,
 *     { timeout: 30000, retries: 3 }
 *   ])
 * );
 *
 * // Runtime validation with type narrowing
 * async function generateWithModel(modelId: unknown) {
 *   if (isAiLanguageModelType(modelId)) {
 *     return generateText({ model: modelId, prompt: 'Hello' });
 *   }
 * }
 *
 * // Error handling with retry logic
 * async function callWithRetry(operation: () => Promise<any>) {
 *   const result = await operation();
 *   if (isAnnotatedRetryMessage(result)) {
 *     const retryTime = new Date(result.data.retryAt);
 *     const delay = Math.max(0, retryTime.getTime() - Date.now());
 *     await sleep(delay);
 *     return callWithRetry(operation); // retry
 *   }
 *   return result;
 * }
 * ```
 *
 * @see {@link https://github.com/seanmobrien/we-dont-need-no-education|Repository}
 */

declare module "@compliance-theater/types/lib/ai/core" {
  // ============================================================================
  // Type Definitions
  // ============================================================================

  /**
   * Utility type for extracting the value type from an object's properties.
   *
   * Used internally for constructing discriminated union types from mapped types.
   *
   * @template ObjectType - The object type to extract values from.
   * @template ValueType - Optional specific key(s) to extract; defaults to all keys.
   *
   * @example
   * ```typescript
   * type Config = { host: string; port: number };
   * type ConfigValue = ValueOf<Config>; // string | number
   * ```
   */
  export type ValueOf<
    ObjectType,
    ValueType extends keyof ObjectType = keyof ObjectType,
  > = ObjectType[ValueType];

  /**
   * Base discriminated union type for annotated error messages.
   *
   * Represents any structured error or retry notification used in AI service
   * communication. The `type` field acts as the discriminator for narrowing.
   *
   * @remarks
   * Members of this union include:
   * - `data-error-retry`: Error with immediate retry-after delay (seconds)
   * - `data-error-notify-retry`: Error with scheduled retry time (ISO 8601)
   *
   * Use type guards for safe narrowing:
   * - {@link isAnnotatedMessageBase} - First-pass check for any error message
   * - {@link isAnnotatedErrorMessage} - Narrow to retry-after errors
   * - {@link isAnnotatedRetryMessage} - Narrow to scheduled retry errors
   *
   * @example
   * ```typescript
   * if (isAnnotatedMessageBase(response)) {
   *   // response has a type field that is either 'data-error-retry'
   *   // or 'data-error-notify-retry'
   *   if (response.type === 'data-error-retry') {
   *     // Handle retry-after error
   *   } else {
   *     // Handle scheduled retry
   *   }
   * }
   * ```
   *
   * @see {@link AnnotatedErrorMessage}
   * @see {@link AnnotatedRetryMessage}
   * @see {@link isAnnotatedMessageBase}
   */
  export type AnnotatedErrorMessageBase = any;

  /**
   * Generic discriminated part extractor for annotated error messages.
   *
   * Utility type that extracts a single variant from the error message union
   * based on the error type key.
   *
   * @template TError - One of the error type keys ('error-retry' or 'error-notify-retry')
   *
   * @remarks
   * Use this when you need to create specific error message types or when building
   * handler functions for individual error variants.
   *
   * @example
   * ```typescript
   * type RetryAfterError = AnnotatedErrorPart<'error-retry'>;
   * type ScheduledRetryError = AnnotatedErrorPart<'error-notify-retry'>;
   * ```
   */
  export type AnnotatedErrorPart<
    TError extends "error-retry" | "error-notify-retry",
  > = any;

  /**
   * Error message indicating a retry-after delay in seconds.
   *
   * Emitted when an operation fails and should be retried after a specific
   * number of seconds. The `reason` field provides diagnostic context.
   *
   * @property type - Discriminator: `'data-error-retry'`
   * @property data.reason - Human-readable error description
   * @property data.retryAfter - Seconds to wait before retrying
   *
   * @remarks
   * This variant is used for inline retry decisions where the delay is relatively
   * short and fixed. For long-term scheduling of retries across multiple requests,
   * use {@link AnnotatedRetryMessage} instead.
   *
   * @see {@link isAnnotatedErrorMessage}
   *
   * @example
   * ```typescript
   * const result = await callApiWithTimeout();
   * if (isAnnotatedErrorMessage(result)) {
   *   console.log(`Retry after ${result.data.retryAfter} seconds`);
   *   await delay(result.data.retryAfter * 1000);
   * }
   * ```
   */
  export type AnnotatedErrorMessage = any;

  /**
   * Error message with scheduled retry time.
   *
   * Emitted when a model or service becomes temporarily unavailable and will
   * be available again at a specific time. Allows coordinated retries across
   * concurrent requests for the same resource.
   *
   * @property type - Discriminator: `'data-error-notify-retry'`
   * @property data.model - The AI model that is unavailable
   * @property data.retryAt - ISO 8601 datetime when model will be available
   *
   * @remarks
   * This variant is ideal for batch operations or queue-based systems where
   * multiple requests may fail for the same model. All can schedule their
   * retry for the same time, improving efficiency.
   *
   * @see {@link isAnnotatedRetryMessage}
   *
   * @example
   * ```typescript
   * if (isAnnotatedRetryMessage(error)) {
   *   const model = error.data.model;
   *   const retryTime = new Date(error.data.retryAt);
   *   console.log(`${model} unavailable until ${retryTime.toISOString()}`);
   *   global.models.markUnavailable(model, retryTime);
   * }
   * ```
   */
  export type AnnotatedRetryMessage = any;

  /**
   * Union of all annotated message types.
   *
   * Represents any structured error or notification message that may be
   * produced by AI service integration layers.
   *
   * @remarks
   * This is the most general annotated message type. For type-safe handling,
   * use type guards to narrow to specific variants:
   * - {@link isAnnotatedMessageBase} - Check if any error message
   * - {@link isAnnotatedErrorMessage} - Check if retry-after error
   * - {@link isAnnotatedRetryMessage} - Check if scheduled retry
   *
   * @see {@link AnnotatedErrorMessage}
   * @see {@link AnnotatedRetryMessage}
   */
  export type AnnotatedMessage = any;

  // ============================================================================
  // Model Type Definitions
  // ============================================================================

  /**
   * Discriminated union of all valid AI model identifiers.
   *
   * Encompasses low and high-fidelity language models, specialized models
   * (text completion, embeddings), brand-specific models (Gemini variants),
   * and provider-specific model variants.
   *
   * @remarks
   * Valid values include:
   * - Generic: `'lofi'`, `'hifi'`, `'completions'`, `'embedding'`
   * - Google Cloud: `'google:lofi'`, `'google:hifi'`, `'google:completions'`, `'google-embedding'`, `'google:gemini-2.0-flash'`
   * - Azure: `'azure:lofi'`, `'azure:hifi'`, `'azure:completions'`, `'azure:embedding'`
   * - Brand: `'gemini-pro'`, `'gemini-flash'`
   *
   * Use {@link isAiModelType} for runtime membership validation.
   * Use {@link AiLanguageModelType} for language-only models (excluding embeddings).
   *
   * @see {@link AiModelTypeValues} for runtime constant array
   * @see {@link isAiModelType} for runtime validation
   * @see {@link AiLanguageModelType} for non-embedding models
   *
   * @example
   * ```typescript
   * const models: AiModelType[] = ['hifi', 'lofi', 'google:hifi'];
   * models.forEach(model => initializeModel(model));
   * ```
   */
  export type AiModelType = any;

  /**
   * Discriminated union of language model types, excluding embedding-only models.
   *
   * Represents all models suitable for text generation, reasoning, and
   * language understanding tasks. Excludes:
   * - `'embedding'`
   * - `'google-embedding'`
   * - `'azure:embedding'`
   * - `'google:embedding'`
   *
   * @remarks
   * Use this type when the API requires a language-capable model and
   * embedding-only models would cause runtime errors. For example, when
   * implementing a constraint that prevents users from selecting an
   * embedding model for text generation.
   *
   * Use {@link isAiLanguageModelType} for runtime validation.
   *
   * @see {@link AiModelType} for all model types
   * @see {@link isAiLanguageModelType} for runtime validation
   *
   * @example
   * ```typescript
   * async function generateText(model: AiLanguageModelType, prompt: string) {
   *   // model is guaranteed not to be an embedding-only variant
   *   const response = await aiSdk.generateText({ model, prompt });
   *   return response.text;
   * }
   *
   * // This is a compile error:
   * generateText('embedding', 'hello'); // TS Error
   *
   * // These are fine:
   * generateText('hifi', 'hello'); // OK
   * generateText('google:hifi', 'hello'); // OK
   * ```
   */
  export type AiLanguageModelType = any;

  // ============================================================================
  // Provider Type Definitions
  // ============================================================================

  /**
   * Discriminated union of all supported AI service providers.
   *
   * Represents the external AI platforms integrated with the application:
   * - `'azure'` - Microsoft Azure OpenAI Service
   * - `'google'` - Google AI / Vertex AI
   * - `'openai'` - OpenAI's public API
   *
   * @remarks
   * Provider types are used for:
   * - Routing requests to the correct API endpoint and authentication
   * - Building provider-specific configuration (model mappings, rate limits)
   * - Implementing provider-specific fallback and retry logic
   *
   * Use {@link isAiProviderType} for runtime membership validation.
   * Use {@link AiProviderTypeValues} for exhaustive iteration or configuration maps.
   *
   * @see {@link AiProviderTypeValues} for runtime constant array
   * @see {@link isAiProviderType} for runtime validation
   *
   * @example
   * ```typescript
   * function getProviderApiKey(provider: AiProviderType): string {
   *   switch (provider) {
   *     case 'azure':
   *       return process.env.AZURE_API_KEY!;
   *     case 'google':
   *       return process.env.GOOGLE_API_KEY!;
   *     case 'openai':
   *       return process.env.OPENAI_API_KEY!;
   *   }
   * }
   * ```
   */
  export type AiProviderType = 'azure' | 'google' | 'openai';

  // ============================================================================
  // Runtime Constants
  // ============================================================================

  /**
   * Runtime constant array of all valid `AiModelType` values.
   *
   * Provides the authoritative source for model identifiers used in:
   * - Membership validation: `AiModelTypeValues.includes(userInput)`
   * - Building exhaustive configuration maps
   * - Iteration over all supported models
   * - Type guard implementation
   *
   * @remarks
   * Maintains stable order across releases. All 16 model variants are included
   * in a logical grouping (base models, brand models, provider variants, etc.).
   *
   * @see {@link AiModelType}
   * @see {@link isAiModelType}
   *
   * @example
   * ```typescript
   * // Build configuration for all models
   * const modelConfigs = Object.fromEntries(
   *   AiModelTypeValues.map(model => [
   *     model,
   *     { timeout: 30000, maxTokens: 4096 }
   *   ])
   * );
   *
   * // Runtime validation
   * if (AiModelTypeValues.includes(userInput as any)) {
   *   useModel(userInput as AiModelType);
   * }
   * ```
   */
  export const AiModelTypeValues: readonly AiModelType[];

  /**
   * Named constant for the generic LoFi (low-fidelity) model.
   *
   * Optimized for speed and cost over output quality and reasoning capability.
   *
   * @remarks
   * Use this for high-volume, latency-sensitive, or cost-constrained applications.
   * Typical use cases: classification, simple summarization, basic Q&A.
   */
  export const AiModelTypeValue_LoFi: AiModelType;

  /**
   * Named constant for the generic HiFi (high-fidelity) model.
   *
   * Optimized for output quality and reasoning capability over speed and cost.
   *
   * @remarks
   * Use this for complex reasoning, detailed analysis, and quality-critical tasks.
   * Typical use cases: creative writing, code generation, nuanced analysis.
   */
  export const AiModelTypeValue_HiFi: AiModelType;

  /**
   * Named constant for Google Cloud's LoFi model variant.
   * @see {@link AiModelTypeValue_LoFi}
   */
  export const AiModelTypeValue_Google_LoFi: AiModelType;

  /**
   * Named constant for Google Cloud's HiFi model variant.
   * @see {@link AiModelTypeValue_HiFi}
   */
  export const AiModelTypeValue_Google_HiFi: AiModelType;

  /**
   * Named constant for text completion model.
   *
   * Specialized model for completing partial text or generating continuations.
   */
  export const AiModelTypeValue_Completions: AiModelType;

  /**
   * Named constant for embedding (vector generation) model.
   *
   * Generates dense vector representations of text for semantic search,
   * similarity matching, clustering, and retrieval-augmented generation.
   *
   * @remarks
   * This model cannot be used for text generation. Use
   * {@link AiLanguageModelType} when you need language-capable models.
   */
  export const AiModelTypeValue_Embedding: AiModelType;

  /**
   * Named constant for Gemini Pro model.
   */
  export const AiModelTypeValue_GeminiPro: AiModelType;

  /**
   * Named constant for Gemini Flash model.
   *
   * Optimized for speed and efficiency while maintaining strong reasoning.
   */
  export const AiModelTypeValue_GeminiFlash: AiModelType;

  /**
   * Named constant for Google Cloud's embedding model.
   * @see {@link AiModelTypeValue_Embedding}
   */
  export const AiModelTypeValue_GoogleEmbedding: AiModelType;

  /**
   * Named constant for Azure OpenAI's LoFi model variant.
   * @see {@link AiModelTypeValue_LoFi}
   */
  export const AiModelTypeValue_Azure_LoFi: AiModelType;

  /**
   * Named constant for Azure OpenAI's HiFi model variant.
   * @see {@link AiModelTypeValue_HiFi}
   */
  export const AiModelTypeValue_Azure_HiFi: AiModelType;

  /**
   * Named constant for Azure OpenAI's completion model.
   * @see {@link AiModelTypeValue_Completions}
   */
  export const AiModelTypeValue_Azure_Completions: AiModelType;

  /**
   * Named constant for Azure OpenAI's embedding model.
   * @see {@link AiModelTypeValue_Embedding}
   */
  export const AiModelTypeValue_Azure_Embedding: AiModelType;

  /**
   * Named constant for Google Cloud's completion model.
   * @see {@link AiModelTypeValue_Completions}
   */
  export const AiModelTypeValue_Google_Completions: AiModelType;

  /**
   * Named constant for Google Cloud's embedding model variant.
   * @see {@link AiModelTypeValue_Embedding}
   */
  export const AiModelTypeValue_Google_Embedding: AiModelType;

  /**
   * Named constant for Google's Gemini 2.0 Flash model.
   * @see {@link AiModelTypeValue_GeminiFlash}
   */
  export const AiModelTypeValue_Google_GeminiFlash_2dot0: AiModelType;

  /**
   * Runtime constant array of all valid `AiProviderType` values.
   *
   * Provides the authoritative source for provider identifiers used in:
   * - Membership validation
   * - Building the complete set of provider configurations
   * - Exhaustive switch statements and type narrowing
   *
   * @remarks
   * Contains exactly 3 entries in defined order.
   *
   * @see {@link AiProviderType}
   * @see {@link isAiProviderType}
   *
   * @example
   * ```typescript
   * // Iterate all providers
   * AiProviderTypeValues.forEach(provider => {
   *   setupProviderIntegration(provider);
   * });
   *
   * // Build configuration
   * const providerConfig = Object.fromEntries(
   *   AiProviderTypeValues.map(p => [p, getConfig(p)])
   * );
   * ```
   */
  export const AiProviderTypeValues: readonly AiProviderType[];

  // ============================================================================
  // Type Guard Functions
  // ============================================================================

  /**
   * Type guard to validate that a value is an `AnnotatedErrorMessageBase`.
   *
   * Checks that the value is an object with a `type` property matching
   * one of the discriminated error message types.
   *
   * @param message - The unknown value to validate.
   * @returns `true` if `message` is an object with a valid error message type
   *          (`'data-error-retry'` or `'data-error-notify-retry'`);
   *          otherwise `false`.
   *
   * @remarks
   * Use this as a first-pass check before narrowing to more specific error types.
   * For specific error handling, use more specialized guards:
   * - {@link isAnnotatedErrorMessage} for retry-after errors
   * - {@link isAnnotatedRetryMessage} for scheduled retry errors
   *
   * @see {@link AnnotatedErrorMessageBase}
   * @see {@link isAnnotatedErrorMessage}
   * @see {@link isAnnotatedRetryMessage}
   *
   * @example
   * ```typescript
   * const result = await callAiService();
   *
   * if (isAnnotatedMessageBase(result)) {
   *   console.log(`Error type: ${result.type}`);
   *   if (result.type === 'data-error-retry') {
   *     // Handle retry-after error
   *   } else {
   *     // Handle scheduled retry
   *   }
   * }
   * ```
   */
  export function isAnnotatedMessageBase(
    message: unknown,
  ): message is AnnotatedErrorMessageBase;

  /**
   * Type guard to validate that a value is an `AnnotatedErrorMessage`.
   *
   * Checks that the value is a valid error message with type `'data-error-retry'`
   * and contains retry-after delay information.
   *
   * @param message - The unknown value to validate.
   * @returns `true` if `message` is an `AnnotatedErrorMessage` with valid
   *          structure; otherwise `false`.
   *
   * @remarks
   * This is a more specific guard than {@link isAnnotatedMessageBase}. It validates
   * not only the message type but also the presence and format of retry metadata.
   *
   * @see {@link AnnotatedErrorMessage}
   * @see {@link isAnnotatedMessageBase}
   *
   * @example
   * ```typescript
   * if (isAnnotatedErrorMessage(error)) {
   *   console.log(`Retry after ${error.data.retryAfter} seconds`);
   *   console.log(`Reason: ${error.data.reason}`);
   *   await delay(error.data.retryAfter * 1000);
   * }
   * ```
   */
  export function isAnnotatedErrorMessage(
    message: unknown,
  ): message is AnnotatedErrorMessage;

  /**
   * Type guard to validate that a value is an `AnnotatedRetryMessage`.
   *
   * Checks that the value represents a scheduled retry notification with:
   * - `type: 'data-error-notify-retry'`
   * - Valid `AiModelType` in the data
   * - ISO 8601 datetime string for scheduled retry time
   *
   * @param message - The unknown value to validate.
   * @returns `true` if `message` is an `AnnotatedRetryMessage` with properly
   *          formatted retry-at datetime; otherwise `false`.
   *
   * @remarks
   * This guard performs strict validation including regex checking of the ISO 8601
   * datetime format. Use this when coordinating retries across multiple requests
   * for the same model.
   *
   * @see {@link AnnotatedRetryMessage}
   * @see {@link isAnnotatedMessageBase}
   *
   * @example
   * ```typescript
   * if (isAnnotatedRetryMessage(notification)) {
   *   const { model, retryAt } = notification.data;
   *   const retryTime = new Date(retryAt);
   *   console.log(`${model} will be available at ${retryTime.toISOString()}`);
   *   global.models.markUnavailable(model, retryTime);
   * }
   * ```
   */
  export function isAnnotatedRetryMessage(
    message: unknown,
  ): message is AnnotatedRetryMessage;

  /**
   * Type guard to validate that a value is a valid `AiModelType`.
   *
   * Checks that the value is a string and is included in `AiModelTypeValues`.
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` is a recognized `AiModelType`;
   *          otherwise `false`.
   *
   * @remarks
   * Use this for runtime validation of model identifiers from user input,
   * API responses, or configuration files. This guard checks membership in
   * the complete set of all models (language and embedding).
   *
   * For language-only models, use {@link isAiLanguageModelType}.
   *
   * @see {@link AiModelType}
   * @see {@link AiModelTypeValues}
   * @see {@link isAiLanguageModelType}
   *
   * @example
   * ```typescript
   * const modelId = getUserInput();
   *
   * if (isAiModelType(modelId)) {
   *   const config = getModelConfig(modelId);
   *   initializeModel(config);
   * } else {
   *   throw new Error(`Unknown model: ${modelId}`);
   * }
   * ```
   */
  export function isAiModelType(value: unknown): value is AiModelType;

  /**
   * Type guard to validate that a value is a valid `AiLanguageModelType`.
   *
   * Checks that the value is an `AiModelType` excluding embedding-only models:
   * - Excludes: `'embedding'`, `'google-embedding'`, `'azure:embedding'`, `'google:embedding'`
   * - Includes: All language models suitable for text generation
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` is an `AiModelType` excluding embedding models;
   *          otherwise `false`.
   *
   * @remarks
   * Use this when enforcing that a model is suitable for language tasks
   * (text generation, reasoning) rather than vector embedding operations.
   * Use wider {@link isAiModelType} if embedding models are also acceptable.
   *
   * @see {@link AiLanguageModelType}
   * @see {@link isAiModelType}
   *
   * @example
   * ```typescript
   * async function generateText(modelId: unknown, prompt: string) {
   *   if (isAiLanguageModelType(modelId)) {
   *     const response = await generateText({
   *       model: modelId,
   *       prompt,
   *     });
   *     return response.text;
   *   } else if (isAiModelType(modelId)) {
   *     throw new Error(`${modelId} is an embedding model, not a language model`);
   *   } else {
   *     throw new Error(`Unknown model: ${modelId}`);
   *   }
   * }
   * ```
   */
  export function isAiLanguageModelType(
    value: unknown,
  ): value is AiLanguageModelType;

  /**
   * Type guard to validate that a value is a valid `AiProviderType`.
   *
   * Checks that the value is a string and is included in `AiProviderTypeValues`.
   *
   * @param value - The unknown value to validate.
   * @returns `true` if `value` is a recognized `AiProviderType`
   *          (`'azure'`, `'google'`, or `'openai'`); otherwise `false`.
   *
   * @remarks
   * Use this for runtime validation of provider identifiers to ensure
   * they match a known integration before attempting to initialize or use it.
   *
   * @see {@link AiProviderType}
   * @see {@link AiProviderTypeValues}
   *
   * @example
   * ```typescript
   * function getProviderCredentials(providerId: unknown) {
   *   if (isAiProviderType(providerId)) {
   *     return credentials[providerId];
   *   } else {
   *     throw new Error(`Unknown provider: ${providerId}`);
   *   }
   * }
   * ```
   */
  export function isAiProviderType(value: unknown): value is AiProviderType;
}

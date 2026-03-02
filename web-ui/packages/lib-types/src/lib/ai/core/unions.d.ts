/**
 * @fileoverview Union type and constant declarations for AI core identifiers.
 *
 * @module @compliance-theater/types/lib/ai/core/unions
 *
 * Provides ambient type declarations for AI model and provider identifier union types,
 * along with their corresponding runtime constant arrays. These definitions enable
 * exhaustive type checking and runtime validation of model and provider identifiers
 * throughout the application.
 *
 * @remarks
 * This module is the single source of truth for all valid model and provider
 * identifiers. Union types derived from these constant arrays ensure compile-time
 * and runtime consistency.
 *
 * The model namespace is organized as follows:
 * - **Fidelity Tiers**: LoFi (cost-optimized), HiFi (quality-optimized)
 * - **Specializations**: Completions (text completion), Embedding (vector generation)
 * - **Brand Models**: Gemini Flash, Gemini Pro (provider-specific)
 * - **Provider Variants**: Provider-prefixed models (e.g., `google:hifi`, `azure:lofi`)
 *
 * Provider types represent supported AI service integrations:
 * - `'azure'`: Microsoft Azure OpenAI Service
 * - `'google'`: Google AI / Vertex AI
 * - `'openai'`: OpenAI API
 *
 * @example
 * ```typescript
 * import type { AiModelType, AiProviderType } from '@compliance-theater/types/lib/ai/core';
 * import { AiModelTypeValues, AiProviderTypeValues } from '@compliance-theater/types/lib/ai/core';
 *
 * // Build configuration maps
 * const modelConfig: Record<AiModelType, Config> = {
 *   hifi: { /* ... *\/ },
 *   lofi: { /* ... *\/ },
 *   'google:hifi': { /* ... *\/ },
 *   // Must include all models; TS will error if missing any
 * };
 *
 * // Runtime validation
 * if (AiModelTypeValues.includes(userInput)) {
 *   const model: AiModelType = userInput as AiModelType;
 *   initializeModel(model);
 * }
 *
 * // Exhaustive provider switch
 * switch (provider) {
 *   case 'azure':
 *   case 'google':
 *   case 'openai':
 *     // All cases handled
 *     break;
 * }
 * ```
 *
 * @see {@link types} for message type definitions
 * @see {@link guards} for runtime type validation functions
 */


/**
 * Runtime constant array containing all valid `AiModelType` values.
 *
 * Used for:
 * - Runtime membership validation (e.g., in ``)
 * - Building exhaustive configuration maps
 * - Iterating over all supported models
 *
 * @remarks
 * This array maintains a stable order and is the authoritative source for valid
 * model identifiers. All model-related type guards check membership in this array.
 *
 * @see {@link AiModelType}
 * @see {@link isAiModelType}
 */
export const AiModelTypeValues: readonly [
  "lofi",
  "hifi",
  "google:lofi",
  "google:hifi",
  "completions",
  "embedding",
  "gemini-pro",
  "gemini-flash",
  "google-embedding",
  "azure:lofi",
  "azure:hifi",
  "azure:completions",
  "azure:embedding",
  "google:completions",
  "google:embedding",
  "google:gemini-2.0-flash",
];

/**
 * Named constant for the LoFi (low-fidelity) model variant.
 *
 * LoFi models are optimized for cost and speed over output quality, suitable for
 * high-volume, latency-sensitive, or cost-conscious applications.
 *
 * @example
 * ```typescript
 * const budget = AiModelTypeValue_LoFi;
 * ```
 *
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_LoFi: "lofi";

/**
 * Named constant for the HiFi (high-fidelity) model variant.
 *
 * HiFi models prioritize output quality and reasoning capability over speed and cost,
 * suitable for complex tasks requiring nuanced responses.
 *
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_HiFi: "hifi";

/**
 * Named constant for Google Cloud's LoFi model variant.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Google_LoFi: "google:lofi";

/**
 * Named constant for Google Cloud's HiFi model variant.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Google_HiFi: "google:hifi";

/**
 * Named constant for text completion model.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Completions: "completions";

/**
 * Named constant for embedding (vector generation) model.
 *
 * Embedding models generate dense vector representations of text for semantic search,
 * similarity matching, and clustering tasks.
 *
 * @see {@link AiModelTypeValues}
 * @see {@link AiLanguageModelType} for language models excluding embeddings
 */
export const AiModelTypeValue_Embedding: "embedding";

/**
 * Named constant for Gemini Pro model.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_GeminiPro: "gemini-pro";

/**
 * Named constant for Gemini Flash model.
 *
 * Gemini Flash is optimized for speed and efficiency while maintaining strong reasoning.
 *
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_GeminiFlash: "gemini-flash";

/**
 * Named constant for Google Cloud's embedding model.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_GoogleEmbedding: "google-embedding";

/**
 * Named constant for Azure OpenAI's LoFi model variant.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Azure_LoFi: "azure:lofi";

/**
 * Named constant for Azure OpenAI's HiFi model variant.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Azure_HiFi: "azure:hifi";

/**
 * Named constant for Azure OpenAI's completion model.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Azure_Completions: "azure:completions";

/**
 * Named constant for Azure OpenAI's embedding model.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Azure_Embedding: "azure:embedding";

/**
 * Named constant for Google Cloud's completion model.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Google_Completions: "google:completions";

/**
 * Named constant for Google Cloud's embedding model variant.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Google_Embedding: "google:embedding";

/**
 * Named constant for Google's Gemini 2.0 Flash model.
 * @see {@link AiModelTypeValues}
 */
export const AiModelTypeValue_Google_GeminiFlash_2dot0: "google:gemini-2.0-flash";

/**
 * Discriminated union of all valid AI model identifiers.
 *
 * Includes low-fidelity and high-fidelity language models, specialized models
 * (completions, embeddings, brand models), and provider-specific variants.
 *
 * @remarks
 * This type is derived from {@link AiModelTypeValues} as a readonly tuple type,
 * enabling exhaustive type checking in maps and switch statements.
 *
 * @example
 * ```typescript
 * function getModelConfig(model: AiModelType): ModelConfig {
 *   switch (model) {
 *     case 'hifi':
 *       return highQualityConfig;
 *     case 'lofi':
 *       return costOptimizedConfig;
 *     // TypeScript ensures all cases are handled
 *   }
 * }
 * ```
 *
 * @see {@link AiLanguageModelType} for excluding embedding models
 * @see {@link isAiModelType} for runtime validation
 */
export type AiModelType = (typeof AiModelTypeValues)[number];

/**
 * Discriminated union of language model types, excluding embedding-only models.
 *
 * Represents all AI models suitable for text generation, reasoning, and completion tasks.
 * Excludes:
 * - `'embedding'`
 * - `'google-embedding'`
 * - `'azure:embedding'`
 * - `'google:embedding'`
 *
 * Use this type when enforcing that a model is appropriate for language tasks
 * rather than vector generation.
 *
 * @remarks
 * This type is derived by excluding embedding models from {@link AiModelType}.
 * The exclusion includes both generic embedding model identifiers and
 * provider-specific embedding variants.
 *
 * @example
 * ```typescript
 * async function generateText(
 *   model: AiLanguageModelType,
 *   prompt: string
 * ): Promise<string> {
 *   // model is guaranteed NOT to be an embedding-only variant
 *   const response = await callLanguageModel(model, prompt);
 *   return response.text;
 * }
 *
 * // This would cause a compile error:
 * generateText('embedding', prompt); // TS Error: 'embedding' not assignable
 *
 * // This is fine:
 * generateText('hifi', prompt); // OK
 * generateText('google:hifi', prompt); // OK
 * ```
 *
 * @see {@link AiModelType} for all model types
 * @see {@link isAiLanguageModelType} for runtime validation
 */
export type AiLanguageModelType = Exclude<
  AiModelType,
  typeof AiModelTypeValue_Embedding | typeof AiModelTypeValue_GoogleEmbedding
>;

/**
 * Runtime constant array containing all valid `AiProviderType` values.
 *
 * Used for:
 * - Runtime membership validation
 * - Building provider-specific configuration maps
 * - Iterating over all supported providers
 *
 * @remarks
 * Maintains stable order and is the authoritative source for valid provider identifiers.
 *
 * @see {@link AiProviderType}
 * @see {@link isAiProviderType}
 */
export const AiProviderTypeValues: readonly ["azure", "google", "openai"];

/**
 * Discriminated union of all supported AI service providers.
 *
 * Represents the set of external AI platforms integrated with the application:
 * - `'azure'`: Microsoft Azure OpenAI Service
 * - `'google'`: Google AI / Vertex AI
 * - `'openai'`: OpenAI's public API
 *
 * @remarks
 * Provider types are used for:
 * - Routing requests to the correct API endpoint and credentials
 * - Building provider-specific configuration and retry logic
 * - Exhaustively handling provider-dependent behavior
 *
 * @example
 * ```typescript
 * function getProviderCredentials(provider: AiProviderType) {
 *   switch (provider) {
 *     case 'azure':
 *       return azureConfig.credentials;
 *     case 'google':
 *       return googleConfig.credentials;
 *     case 'openai':
 *       return openaiConfig.credentials;
 *   }
 * }
 * ```
 *
 * @see {@link isAiProviderType} for runtime validation
 */
export type AiProviderType = (typeof AiProviderTypeValues)[number];


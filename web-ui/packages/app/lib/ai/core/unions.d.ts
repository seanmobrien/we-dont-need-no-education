/**
 * Array containing possible values for AiModelType.
 */
export declare const AiModelTypeValues: readonly ["lofi", "hifi", "google:lofi", "google:hifi", "completions", "embedding", "gemini-pro", "gemini-flash", "google-embedding", "azure:lofi", "azure:hifi", "azure:completions", "azure:embedding", "google:completions", "google:embedding", "google:gemini-2.0-flash"];
export declare const AiModelTypeValue_LoFi: "lofi";
export declare const AiModelTypeValue_HiFi: "hifi";
export declare const AiModelTypeValue_Google_LoFi: "google:lofi";
export declare const AiModelTypeValue_Google_HiFi: "google:hifi";
export declare const AiModelTypeValue_Completions: "completions";
export declare const AiModelTypeValue_Embedding: "embedding";
export declare const AiModelTypeValue_GeminiPro: "gemini-pro";
export declare const AiModelTypeValue_GeminiFlash: "gemini-flash";
export declare const AiModelTypeValue_GoogleEmbedding: "google-embedding";
export declare const AiModelTypeValue_Azure_LoFi: "azure:lofi";
export declare const AiModelTypeValue_Azure_HiFi: "azure:hifi";
export declare const AiModelTypeValue_Azure_Completions: "azure:completions";
export declare const AiModelTypeValue_Azure_Embedding: "azure:embedding";
export declare const AiModelTypeValue_Google_Completions: "google:completions";
export declare const AiModelTypeValue_Google_Embedding: "google:embedding";
export declare const AiModelTypeValue_Google_GeminiFlash_2dot0: "google:gemini-2.0-flash";
/**
 * Defines the type of AI model being used.
 * LoFi models are used for low-fidelity tasks, HiFi models for high-fidelity tasks,
 * Completions for generating text completions, and Embedding for generating embeddings.
 */
export type AiModelType = (typeof AiModelTypeValues)[number];
/**
 * Represents all AI model types except for the embedding model types.
 *
 * This type is derived by excluding the embedding model types (`AiModelTypeValue_Embedding` and `AiModelTypeValue_GoogleEmbedding`)
 * from the set of all available AI model types (`AiModelType`).
 *
 * @see AiModelType
 * @see AiModelTypeValue_Embedding
 * @see AiModelTypeValue_GoogleEmbedding
 */
export type AiLanguageModelType = Exclude<AiModelType, typeof AiModelTypeValue_Embedding | typeof AiModelTypeValue_GoogleEmbedding>;
export declare const AiProviderTypeValues: readonly ["azure", "google", "openai"];
/**
 * Available AI providers
 */
export type AiProviderType = (typeof AiProviderTypeValues)[number];
//# sourceMappingURL=unions.d.ts.map
/**
 * Array containing possible values for AiModelType.
 */
export const AiModelTypeValues = [
  'lofi',
  'hifi',
  'completions',
  'embedding',
  'gemini-pro',
  'gemini-flash',
  'google-embedding',
] as const;

export const AiModelTypeValue_LoFi = AiModelTypeValues[0];
export const AiModelTypeValue_HiFi = AiModelTypeValues[1];
export const AiModelTypeValue_Completions = AiModelTypeValues[2];
export const AiModelTypeValue_Embedding = AiModelTypeValues[3];
export const AiModelTypeValue_GeminiPro = AiModelTypeValues[4];
export const AiModelTypeValue_GeminiFlash = AiModelTypeValues[5];
export const AiModelTypeValue_GoogleEmbedding = AiModelTypeValues[6];
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
export type AiLanguageModelType = Exclude<
  AiModelType,
  typeof AiModelTypeValue_Embedding | typeof AiModelTypeValue_GoogleEmbedding
>;

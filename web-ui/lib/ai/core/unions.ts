/**
 * Array containing possible values for AiModelType.
 */
export const AiModelTypeValues = [
  'lofi',
  'hifi',
  'google:lofi',
  'google:hifi',
  'completions',
  'embedding',
  'gemini-pro',
  'gemini-flash',
  'google-embedding',
  'azure:lofi',
  'azure:hifi',
  'azure:completions',
  'azure:embedding',
  'google:completions',
  'google:embedding',
  'google:gemini-2.0-flash',
] as const;

export const AiModelTypeValue_LoFi = AiModelTypeValues[0];
export const AiModelTypeValue_HiFi = AiModelTypeValues[1];
export const AiModelTypeValue_Google_LoFi = AiModelTypeValues[2];
export const AiModelTypeValue_Google_HiFi = AiModelTypeValues[3];
export const AiModelTypeValue_Completions = AiModelTypeValues[4];
export const AiModelTypeValue_Embedding = AiModelTypeValues[5];
export const AiModelTypeValue_GeminiPro = AiModelTypeValues[6];
export const AiModelTypeValue_GeminiFlash = AiModelTypeValues[7];
export const AiModelTypeValue_GoogleEmbedding = AiModelTypeValues[8];
export const AiModelTypeValue_Azure_LoFi = AiModelTypeValues[9];
export const AiModelTypeValue_Azure_HiFi = AiModelTypeValues[10];
export const AiModelTypeValue_Azure_Completions = AiModelTypeValues[11];
export const AiModelTypeValue_Azure_Embedding = AiModelTypeValues[12];
export const AiModelTypeValue_Google_Completions = AiModelTypeValues[13];
export const AiModelTypeValue_Google_Embedding = AiModelTypeValues[14];
export const AiModelTypeValue_Google_GeminiFlash_2dot0 = AiModelTypeValues[15];

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

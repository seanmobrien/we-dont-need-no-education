/**
 * Array containing possible values for AiModelType.
 */
export const AiModelTypeValues = [
  'lofi',
  'hifi',
  'completions',
  'embedding',
] as const;

export const AiModelTypeValue_LoFi = AiModelTypeValues[0];
export const AiModelTypeValue_HiFi = AiModelTypeValues[1];
export const AiModelTypeValue_Completions = AiModelTypeValues[2];
export const AiModelTypeValue_Embedding = AiModelTypeValues[3];
/**
 * Defines the type of AI model being used.
 * LoFi models are used for low-fidelity tasks, HiFi models for high-fidelity tasks,
 * Completions for generating text completions, and Embedding for generating embeddings.
 */
export type AiModelType = (typeof AiModelTypeValues)[number];

/**
 * Represents all AI model types except for the embedding model type.
 *
 * This type is derived by excluding the embedding model type (`AiModelTypeValue_Embedding`)
 * from the set of all available AI model types (`AiModelType`).
 *
 * @see AiModelType
 * @see AiModelTypeValue_Embedding
 */
export type AiLanguageModelType = Exclude<
  AiModelType,
  typeof AiModelTypeValue_Embedding
>;

import { AiModelType, AiModelTypeValues } from './unions';
import { ChatOptions, EmbeddingOptions } from './types';

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
): value is Exclude<AiModelType, 'embedding'> =>
  isAiModelType(value) && value !== 'embedding';

/**
 * Type guard to determine if a given value is of type `ChatOptions`.
 *
 * This function checks if the provided value is a non-null object and contains at least
 * one of the expected `ChatOptions` properties with the correct type:
 * - `model` (string)
 * - `temperature` (number)
 * - `maxTokens` (number)
 * - `topP` (number)
 * - `frequencyPenalty` (number)
 * - `presencePenalty` (number)
 * - `stopSequences` (array of strings or empty array)
 *
 * @param value - The value to check.
 * @returns `true` if the value matches the `ChatOptions` shape, otherwise `false`.
 */
export const isChatOptions = (value: unknown): value is ChatOptions => {
  if (
    typeof value === 'undefined' ||
    typeof value !== 'object' ||
    value === null
  ) {
    return false;
  }
  if ('model' in value && typeof value.model === 'string') {
    return true;
  }
  if ('temperature' in value && typeof value.temperature === 'number') {
    return true;
  }
  if ('maxTokens' in value && typeof value.maxTokens === 'number') {
    return true;
  }
  if ('topP' in value && typeof value.topP === 'number') {
    return true;
  }
  if (
    'frequencyPenalty' in value &&
    typeof value.frequencyPenalty === 'number'
  ) {
    return true;
  }
  if ('presencePenalty' in value && typeof value.presencePenalty === 'number') {
    return true;
  }
  if (
    'stopSequences' in value &&
    Array.isArray(value.stopSequences) &&
    (value.stopSequences.length === 0 ||
      value.stopSequences.every((seq) => typeof seq === 'string'))
  ) {
    return true;
  }
  // Technically it could have just a user object and still be valid, but that doesn't really give us enough information to make sure it's not one of the other option types.
  return false;
};

/**
 * Type guard to determine if a given value conforms to the `EmbeddingOptions` interface.
 *
 * This function checks if the provided value is a non-null object and contains at least one of the following properties:
 * - `dimensions`: Must be either 1536 or 3072.
 * - `maxEmbeddingsPerCall`: Must be a number.
 * - `user`: Must be a string.
 *
 * @param value - The value to check.
 * @returns `true` if the value matches the `EmbeddingOptions` shape, otherwise `false`.
 */
export const isEmbeddingOptions = (
  value: unknown,
): value is EmbeddingOptions => {
  if (
    typeof value === 'undefined' ||
    typeof value !== 'object' ||
    value === null
  ) {
    return false;
  }
  if (
    'dimensions' in value &&
    (value.dimensions === 1536 || value.dimensions === 3072)
  ) {
    return true;
  }
  if (
    'maxEmbeddingsPerCall' in value &&
    typeof value.maxEmbeddingsPerCall === 'number'
  ) {
    return true;
  }
  if ('user' in value && typeof value.user === 'string') {
    return true;
  }
  return false;
};

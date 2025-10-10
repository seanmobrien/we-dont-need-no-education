import { log } from '@/lib/logger';

/**
 * Creates a seeded pseudo-random number generator function using a linear congruential generator algorithm.
 *
 * @param seed - The initial seed value for the random number generator.
 * @returns A function that, when called, returns a pseudo-random number between 0 (inclusive) and 1 (exclusive).
 */
const seededRandom = (seed: number): (() => number) => {
  return () => {
    seed = (seed * 9301 + 49297) % 233280; // Linear congruential generator
    return Math.abs(seed / 233280);
  };
};

/**
 * This function generates a simple hash by iterating over each character in the string.
 * It uses a basic algorithm that shifts the hash value and adds the character's ASCII code.
 * This is not a cryptographic hash and should not be used for security purposes.
 * It is intended for generating a consistent hash value for a given string, such as for use in identifiers or keys.
 * @param str - The string to hash.
 * @returns The generated hash as a string.
 */
export const notCryptoSafeKeyHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
};

/**
 * Generates a chat ID using a simple seeded random function.
 * The generated ID is an 8-character string consisting of lowercase letters, digits, and special characters.
 * If a seed is provided, the same ID will be generated for the same seed.
 * This function is not cryptographically secure.
 *
 * @param seed - Optional. The seed value to initialize the random number generator. If not provided, a random seed is used.
 * @returns An object containing the seed used and the generated chat ID string.
 */
export const generateChatId = (
  seed?: number | string,
): { seed: number; id: string } => {
  // Does not need to be cryptographically secure, so we can use a simple seeded random function
  let actualSeed: number;
  if (!seed) {
    actualSeed = Math.floor(Math.random() * 1000000);
  } else if (typeof seed === 'number') {
    actualSeed = seed;
  } else {
    actualSeed = Number.parseInt(notCryptoSafeKeyHash(seed), 10);
  }
  const random = seededRandom(actualSeed);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@$%~';
  let id = '';
  for (let i = 0; i < 8; i++) {
    const cb = chars[Math.floor(random() * chars.length)];
    if (cb === undefined) {
      log((l) => l.error('Chat ID generation failed', { seed: actualSeed }));
    }
    id += cb ?? '';
  }
  return {
    seed: actualSeed,
    id,
  };
};

/**
 * Splits a compound identifier into primary and secondary parts using the first colon (":") as a delimiter.
 *
 * The function is defensive and will never throw. It handles malformed inputs by returning empty or partial results,
 * and emits warnings for non-ideal cases. No trimming or normalization is performed on the input.
 *
 * Behavior summary:
 * - If `id` is falsy (e.g., empty string), returns ["", undefined].
 * - If no colon is found, returns [id, undefined].
 * - If the colon is the first or last character (e.g., ":foo" or "foo:"), returns ["", undefined].
 * - Otherwise, returns [leftOfColon, rightOfColon].
 *
 * @param id - The identifier to split, typically in the form "primary:secondary".
 * @returns A tuple containing the primary segment and an optional secondary segment: [primary, secondary | undefined].
 *
 * @remarks
 * - Only the first colon is used as the split point; additional colons remain in the secondary segment.
 * - This function does not trim whitespace or validate segment content.
 * - Logs warnings for unexpected inputs and edge cases.
 *
 * @example
 * // Basic usage with both parts
 * const [chatId, messageId] = splitIds("chat123:msg456");
 * // chatId === "chat123"
 * // messageId === "msg456"
 *
 * @example
 * // No secondary part present
 * const [chatId, messageId] = splitIds("chat123");
 * // chatId === "chat123"
 * // messageId === undefined
 *
 * @example
 * // Empty or falsy input
 * const [chatId, messageId] = splitIds("");
 * // chatId === ""
 * // messageId === undefined
 *
 * @example
 * // Invalid placement of delimiter
 * splitIds(":msg");   // ["", undefined]
 * splitIds("chat:");  // ["", undefined]
 *
 * @example
 * // Only the first colon is used for splitting
 * const [primary, secondary] = splitIds("a:b:c:d");
 * // primary === "a"
 * // secondary === "b:c:d"
 *
 * @example
 * // Safe destructuring with defaults and recomposition
 * const [primary, secondary] = splitIds(userInput ?? "");
 * const canonicalId = secondary ? `${primary}:${secondary}` : primary;
 *
 * @example
 * // Using with guards
 * const [entityId, subId] = splitIds(sourceId);
 * if (!subId) {
 *   // Handle entity-level operations
 * } else {
 *   // Handle sub-entity operations
 * }
 */
export const splitIds = (id: string): [string, string | undefined] => {
  if (!id) {
    log((l) => l.warn('No ID provided to splitIds, returning emtpy values.'));
    return ['', undefined];
  }
  const splitIndex = id.indexOf(':');
  if (splitIndex === -1) {
    log((l) => l.warn('No ":" found in ID, returning as is.'));
    return [id, undefined];
  }
  if (splitIndex === 0 || splitIndex === id.length - 1) {
    log((l) => l.warn('Invalid ID format, returning empty values.'));
    return ['', undefined];
  }
  return [id.slice(0, splitIndex), id.slice(splitIndex + 1)];
};

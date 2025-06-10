/**
 * Creates a seeded pseudo-random number generator function using a linear congruential generator algorithm.
 *
 * @param seed - The initial seed value for the random number generator.
 * @returns A function that, when called, returns a pseudo-random number between 0 (inclusive) and 1 (exclusive).
 */
const seededRandom = (seed: number): (() => number) => {
  return () => {
    seed = (seed * 9301 + 49297) % 233280; // Linear congruential generator
    return seed / 233280;
  };
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
export const generateChatId = (seed?: number): { seed: number; id: string } => {
  // Does not need to be cryptographically secure, so we can use a simple seeded random function
  const actualSeed = seed ?? Math.floor(Math.random() * 1000000);
  const random = seededRandom(actualSeed);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@$%~';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(random() * chars.length)];
  }
  return {
    seed: actualSeed,
    id,
  };
};

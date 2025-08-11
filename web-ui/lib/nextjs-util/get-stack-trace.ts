/**
 * Retrieves the current stack trace as a string, optionally skipping a specified number of stack frames.
 *
 * @param options - An optional object to configure stack trace retrieval.
 * @param options.skip - The number of stack frames to skip from the top (default is 1).
 * @returns The stack trace as a string, with the specified number of frames skipped.
 */
export const getStackTrace = ({ skip = 1 }: { skip?: number } = {}): string => {
  const stack = new Error().stack?.split('\n').slice(skip + 1);
  return stack ? stack.join('\n') : '';
};

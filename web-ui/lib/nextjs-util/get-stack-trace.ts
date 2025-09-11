/**
 * Retrieves the current stack trace as a string, optionally skipping a specified number of stack frames.
 *
 * @param options - An optional object to configure stack trace retrieval.
 * @param options.skip - The number of stack frames to skip from the top (default is 1).
 * @param options.max - The maximum number of stack frames to include (default is all).
 * @param options.myCodeOnly - If true, filters the stack to include only frames from your code (excluding node_modules) (default is true).
 * @returns The stack trace as a string, with the specified number of frames skipped.
 */
export const getStackTrace = ({
  skip = 1,
  max,
  myCodeOnly = true,
}: { skip?: number; max?: number; myCodeOnly?: boolean } = {}): string => {
  const originalStackFrames = new Error().stack?.split('\n') ?? [];
  let stackFrames = [...originalStackFrames];
  if (myCodeOnly && stackFrames) {
    const mustNotInclude = [
      'node_modules',
      'internal/',
      'bootstrap_node.js',
      'webpack-runtime',
    ];
    // Always include the top and bottom level frames, filter others to only include files not in a node_modules folder.
    stackFrames = stackFrames
      .filter(
        (frame, idx, arr) =>
          frame.trim().length > 0 &&
          (idx === arr.length - 1 ||
            idx === 0 ||
            mustNotInclude.every((x) => !frame.includes(x))),
      )
      // Trim excess whitespace from each frame
      .map((f) => f.trim());
    if (!stackFrames.length && originalStackFrames.length) {
      // If filtering removed everything, fall back to the original stack
      stackFrames = originalStackFrames;
    }
  }
  // handle skip and max then recombine
  return stackFrames?.length
    ? stackFrames.slice(skip ?? 1, max).join('\n')
    : '';
};

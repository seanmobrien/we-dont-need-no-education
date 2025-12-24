declare module '@/lib/nextjs-util/get-stack-trace' {
  /**
   * Retrieves the current stack trace as a string, optionally skipping a specified number of stack frames.
   *
   * @param options - An optional object to configure stack trace retrieval.
   * @param options.skip - The number of stack frames to skip from the top (default is 1).
   * @param options.max - The maximum number of stack frames to include (default is all).
   * @param options.myCodeOnly - If true, filters the stack to include only frames from your code (excluding node_modules) (default is true).
   * @returns The stack trace as a string, with the specified number of frames skipped.
   *
   * @example
   * ```typescript
   * // Get current stack trace
   * const stack = getStackTrace();
   *
   * // Skip first 2 frames
   * const stack = getStackTrace({ skip: 2 });
   *
   * // Include all frames (even node_modules)
   * const fullStack = getStackTrace({ myCodeOnly: false });
   *
   * // Limit to 5 frames
   * const limitedStack = getStackTrace({ max: 5 });
   * ```
   */
  export const getStackTrace: (options?: {
    skip?: number;
    max?: number;
    myCodeOnly?: boolean;
  }) => string;
}

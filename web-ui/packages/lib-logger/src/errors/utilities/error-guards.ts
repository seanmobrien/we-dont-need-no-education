// Type guards and utility functions for error handling

/**
 * Type guard to check if a value is an instance of Error
 * or at least has the basic shape of an Error object.
 */
export const isError = (value: unknown): value is Error => {
  return (
    !!value &&
    typeof value === 'object' &&
    (value instanceof Error || ('message' in value && 'name' in value))
  );
};

export type SafeProgressEvent<T extends EventTarget = EventTarget> = Event & {
  /**
   * The **`ProgressEvent.lengthComputable`** read-only property is a boolean flag indicating if the resource concerned by the length
   * of the operation.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/lengthComputable)
   */
  readonly lengthComputable: boolean;
  /**
   * The **`ProgressEvent.loaded`** read-only property is a number indicating the size of the data already transmitted or processed.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/loaded)
   */
  readonly loaded: number;
  readonly target: T | null;
  /**
   * The **`ProgressEvent.total`** read-only property is a number indicating the total size of the data being transmitted or processed.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/total)
   */
  readonly total: number;
};

/**
 * Type guard to check if a value is an XMLHttpRequest
 */
export const isXmlHttpRequest = (value: unknown): value is XMLHttpRequest => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'readyState' in value &&
    'status' in value &&
    'timeout' in value &&
    'upload' in value &&
    'response' in value &&
    'open' in value &&
    typeof value.open === 'function' &&
    'send' in value &&
    typeof value.send === 'function'
  );
};

/**
 * Type guard to check if a value is a ProgressEvent from an XMLHttpRequest
 */
export const isProgressEvent = (
  value: unknown,
): value is SafeProgressEvent<XMLHttpRequest> =>
  typeof value === 'object' &&
  !!value &&
  'target' in value &&
  isXmlHttpRequest(value.target) &&
  'loaded' in value &&
  typeof value.loaded === 'number' &&
  'total' in value &&
  typeof value.total === 'number' &&
  'lengthComputable' in value &&
  typeof value.lengthComputable === 'boolean';

/**
 * Type guard to check if a value is an Abort error
 */
export const isAbortError = (value: unknown): value is Error => {
  return value instanceof DOMException && value.name === 'AbortError';
};

/**
 * Get a stack trace with optional filtering
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

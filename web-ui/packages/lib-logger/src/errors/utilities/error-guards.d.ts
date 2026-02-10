// Type guards and utility functions for error handling

/**
 * Type guard to check if a value is an instance of Error
 * or at least has the basic shape of an Error object.
 */
export declare const isError: (value: unknown) => value is Error;

export type SafeProgressEvent<T extends EventTarget = EventTarget> = Event & {
  readonly lengthComputable: boolean;
  readonly loaded: number;
  readonly target: T | null;
  readonly total: number;
};

/**
 * Type guard to check if a value is an XMLHttpRequest
 */
export declare const isXmlHttpRequest: (value: unknown) => value is XMLHttpRequest;

/**
 * Type guard to check if a value is a ProgressEvent from an XMLHttpRequest
 */
export declare const isProgressEvent: (
  value: unknown,
) => value is SafeProgressEvent<XMLHttpRequest>;

/**
 * Type guard to check if a value is an Abort error
 */
export declare const isAbortError: (value: unknown) => value is Error;

/**
 * Get a stack trace with optional filtering
 */
export declare const getStackTrace: ({
  skip,
  max,
  myCodeOnly,
}?: { skip?: number; max?: number; myCodeOnly?: boolean }) => string;

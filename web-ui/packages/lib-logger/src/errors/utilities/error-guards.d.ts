import type { SafeProgressEvent } from './safe-progress-event';


declare module '@compliance-theater/logger/errors/utilities/error-guards' {
// Type guards and utility functions for error handling

/**
 * Type guard to check if a value is an instance of Error
 * or at least has the basic shape of an Error object.
 */
export const isError: (value: unknown) => value is Error;


/**
 * Type guard to check if a value is an XMLHttpRequest
 */
export const isXmlHttpRequest: (value: unknown) => value is XMLHttpRequest;

/**
 * Type guard to check if a value is a ProgressEvent from an XMLHttpRequest
 */
export const isProgressEvent: (
  value: unknown,
) => value is SafeProgressEvent<XMLHttpRequest>;

/**
 * Type guard to check if a value is an Abort error
 */
export const isAbortError: (value: unknown) => value is Error;

/**
 * Get a stack trace with optional filtering
 */
export const getStackTrace: ({
  skip,
  max,
  myCodeOnly,
}?: { skip?: number; max?: number; myCodeOnly?: boolean }) => string;

}
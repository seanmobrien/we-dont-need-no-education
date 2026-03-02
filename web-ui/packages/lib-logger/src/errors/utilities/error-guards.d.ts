import type { SafeProgressEvent } from './safe-progress-event';



// Type guards and utility functions for error handling

/**
 * Type guard to check if a value is an instance of Error
 * or at least has the basic shape of an Error object.
 */
function isError(value: unknown): value is Error;


/**
 * Type guard to check if a value is an XMLHttpRequest
 */
function isXmlHttpRequest(value: unknown): value is XMLHttpRequest;

/**
 * Type guard to check if a value is a ProgressEvent from an XMLHttpRequest
 */
function isProgressEvent(
  value: unknown,
): value is SafeProgressEvent<XMLHttpRequest>;

/**
 * Type guard to check if a value is an Abort error
 */
export function isAbortError(value: unknown): value is Error;



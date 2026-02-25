// Type guards and utility functions for error handling
import type { SafeProgressEvent } from './safe-progress-event';
import { deprecate } from '@compliance-theater/types/deprecate';
import { getStackTrace as getStackTraceBase } from '@compliance-theater/types/get-stack-trace';

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
export const getStackTrace = deprecate(
  getStackTraceBase,
  'getStackTrace is deprecated. Please use getStackTrace from @compliance-theater/types directly.',
  'DEP004',
);

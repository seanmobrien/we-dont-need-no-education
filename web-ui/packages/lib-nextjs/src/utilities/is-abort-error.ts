/**
 * Type guard to check if a value is an AbortError
 * Copied from react-util to avoid circular dependency
 */
export const isAbortError = (value: unknown): value is Error => {
  return value instanceof DOMException && value.name === 'AbortError';
};

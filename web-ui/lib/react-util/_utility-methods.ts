/**
 * @module _utility-methods
 *
 * A collection of utility methods for use in React applications.
 */

/**
 * Generates a unique identifier string.
 *
 * @returns {string} A unique identifier consisting of 7 alpha-numeric characters.
 */
export const generateUniqueId = () =>
  Math.random().toString(36).substring(2, 9);

/**
 * Checks if the given value is an instance of the Error object.
 *
 * @param value - The value to check.
 * @returns True if the value is an Error object, otherwise false.
 */
export const isError = (value: unknown): value is Error =>
  typeof value === 'object' && value !== null && 'message' in value;

/**
 * Checks if the given value is a DOMException with the name 'AbortError'.
 *
 * @param value - The value to check.
 * @returns True if the value is a DOMException with the name 'AbortError', otherwise false.
 */
export const isAbortError = (value: unknown): value is DOMException =>
  isError(value) && value.name === 'AbortError';

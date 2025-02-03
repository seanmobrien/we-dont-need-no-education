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

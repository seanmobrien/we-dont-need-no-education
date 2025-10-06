/**
 * @file next-console-error.ts
 * @description
 *   Utilities for identifying and working with Next.js console errors in a type-safe way.
 *   Next.js attaches special symbols to error objects that are logged to the console, allowing
 *   for programmatic detection and handling of these errors. This module provides types and a
 *   type guard for working with these errors in React/Next.js applications.
 *
 * @example
 *   import { isConsoleError } from '/lib/react-util/errors/next-console-error';
 *
 *   try {
 *     // ...some code that may throw...
 *   } catch (err) {
 *     if (isConsoleError(err)) {
 *       // Handle Next.js console error specifically
 *       console.warn('Next.js Console Error:', err[nextDigestSymbol], err[nextConsoleErrorType]);
 *     }
 *   }
 *
 * @exports
 *   - NextConsoleErrorType: Type union for Next.js console error levels
 *   - NextConsoleError: Type for errors with Next.js console error symbols
 *   - isConsoleError: Type guard for detecting Next.js console errors
 */

const nextDigestSymbol = Symbol.for('next.console.error.digest');
const nextConsoleErrorType = Symbol.for('next.console.error.type');

/**
 * Represents the possible types of console messages in a Next.js application.
 *
 * - `'error'`: Indicates an error message.
 * - `'warning'`: Indicates a warning message.
 * - `'info'`: Indicates an informational message.
 * - `'log'`: Indicates a general log message.
 */
export type NextConsoleErrorType = 'error' | 'warning' | 'info' | 'log';

/**
 * Represents an enhanced Error object used in Next.js for console error handling.
 *
 * @remarks
 * This type extends the standard `Error` object with additional properties specific to Next.js error reporting.
 *
 * @property {string} [nextDigestSymbol] - A unique digest string associated with the error, used for error tracking and identification.
 * @property {string} environmentName - The name of the environment in which the error occurred (e.g., "production", "development").
 * @property {NextConsoleErrorType} [nextConsoleErrorType] - The type of the console error, providing additional context about the error's origin or category.
 */
export type NextConsoleError = Error & {
  [nextDigestSymbol]: string;
  [nextConsoleErrorType]?: NextConsoleErrorType;
  environmentName?: string;
};

/**
 * Determines whether the provided error object is a {@link NextConsoleError}.
 *
 * Checks if the error is a non-null object, contains the `nextDigestSymbol` property,
 * and that the value of this property is `'NEXT_CONSOLE_ERROR'`.
 *
 * @param error - The value to check.
 * @returns `true` if the error is a `NextConsoleError`, otherwise `false`.
 */
export const isConsoleError = (error: unknown): error is NextConsoleError =>
  typeof error === 'object' &&
  !!error &&
  nextDigestSymbol in error &&
  error[nextDigestSymbol] === 'NEXT_CONSOLE_ERROR';

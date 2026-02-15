/**
 * @file error-like.ts
 * @description
 *   Utilities for normalizing, branding, and type-guarding error-like objects in TypeScript/JavaScript.
 *   This module provides a lightweight, type-safe way to work with error values that may be strings,
 *   native Error objects, or plain objects with error-like properties. It is especially useful for
 *   error handling in codebases where errors may come from many sources (e.g., network, user, 3rd-party libs).
 *
 *   - The `ErrorLike` type describes a minimal error shape (message, name, stack, cause).
 *   - The `isErrorLike` function is a type guard that checks if a value is an ErrorLike, and brands it for fast future checks.
 *   - The `isStringOrErrorLike` function checks if a value is a non-empty string or ErrorLike.
 *   - The `asErrorLike` function converts a string or ErrorLike into a branded ErrorLike object.
 *
 * @example
 *   import { isErrorLike, asErrorLike, isStringOrErrorLike } from '@/lib/react-util/errors/error-like';
 *
 *   function handleError(err: unknown) {
 *     if (isErrorLike(err)) {
 *       // Safe to access err.message, err.name, etc.
 *       console.error(err.message);
 *     } else if (isStringOrErrorLike(err)) {
 *       const normalized = asErrorLike(err);
 *       // Now normalized is an ErrorLike
 *     }
 *   }
 *
 * @exports
 *   - ErrorLike: Minimal error object type
 *   - StringOrErrorLike: string | ErrorLike union
 *   - isErrorLike: Type guard for ErrorLike
 *   - isStringOrErrorLike: Type guard for string or ErrorLike
 *   - asErrorLike: Normalizes a value to ErrorLike
 */

declare module 'lib/react-util/errors/error-like' {
  /**
   * Represents a minimal, serializable error-like object.
   * This is useful for normalizing errors that may not be real Error instances.
   *
   * @property message - The error message (required)
   * @property name - The error name/type (optional)
   * @property stack - The stack trace, if available (optional)
   * @property cause - The underlying cause, if any (optional)
   * @property source - Optional source for the error, e.g., filename
   * @property line - Optional line number for the error
   * @property column - Optional column number for the error
   */
  export type ErrorLike = {
    message: string;
    name: string;
    stack?: string;
    cause?: unknown;
    source?: string;
    line?: number;
    column?: number;
  };

  /**
   * Optional values that can be passed to {@link asErrorLike} to customize the resulting ErrorLike object.
   * These options allow you to specify additional properties like line number, column, and filename,
   * which will be used to build stack trace data if it is not already present.
   */
  export type AsErrorLikeOptions = Partial<Omit<ErrorLike, 'message'>> & {
    /**
     * The line number where the error occurred, used to build a minimal stack trace if needed.
     */
    line?: number;
    /**
     * The column number where the error occurred, used to build a minimal stack trace if needed.
     */
    col?: number;
    /**
     * The filename where the error occurred, used to build a minimal stack trace if needed.
     * This is useful for debugging and tracing errors back to their source.
     */
    filename?: string;
  };

  /**
   * A value that is either a string or an ErrorLike object.
   * Useful for APIs that accept or return either error messages or error objects.
   */
  export type StringOrErrorLike = string | ErrorLike;

  /**
   * Type guard to check if a value is an ErrorLike object.
   *
   * - Returns true if the value is an object with a string message property and (optionally) name, stack, and cause.
   * - Brands the object for fast future checks.
   *
   * @param value - The value to check
   * @returns True if value is ErrorLike, false otherwise
   */
  export function isErrorLike(value: unknown): value is ErrorLike;

  /**
   * Type guard to check if a value is a non-empty string or an ErrorLike object.
   *
   * @param value - The value to check
   * @returns True if value is a non-empty string or ErrorLike, false otherwise
   */
  export function isStringOrErrorLike(
    value: unknown,
  ): value is StringOrErrorLike;

  /**
   * Converts a string or ErrorLike value into a branded ErrorLike object.
   *
   * - If given a string, returns a new ErrorLike with the provided name (default: 'ErrorLike').
   * - If given an ErrorLike, brands it and returns it.
   *
   * @param value - The string or ErrorLike to normalize
   * @param options - Optional configuration for the error (name, stack, cause, etc.)
   * @returns A branded ErrorLike object
   */
  export function asErrorLike(
    value: unknown,
    options?: AsErrorLikeOptions,
  ): ErrorLike | undefined;
}

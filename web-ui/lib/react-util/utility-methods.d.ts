/**
 * @fileoverview A collection of utility methods for use in React applications.
 * @module _utility-methods
 */

declare module 'lib/react-util/utility-methods' {
  /**
   * Generates a unique identifier string.
   *
   * @returns {string} A unique identifier consisting of 7 alpha-numeric characters.
   */
  export function generateUniqueId(): string;

  /**
   * Checks if the given value is an instance of the Error object.
   *
   * @param value - The value to check.
   * @returns True if the value is an Error object, otherwise false.
   */
  export function isError(value: unknown): value is Error;

  /**
   * Checks if the given value is a DOMException with the name 'AbortError'.
   *
   * @param value - The value to check.
   * @returns True if the value is a DOMException with the name 'AbortError', otherwise false.
   */
  export function isAbortError(value: unknown): value is Error;

  /**
   * Type guard to check if a value is a ProgressEvent from an XMLHttpRequest.
   * This is useful for distinguishing progress events in AJAX requests, which are thrown
   * as errors in some contexts (e.g., Fetch API polyfills).
   * @param value - The value to check.
   * @returns True if the value is a ProgressEvent from an XMLHttpRequest, otherwise false.
   *
   */
  export function isProgressEvent(
    value: unknown,
  ): value is ProgressEvent<XMLHttpRequest>;

  /**
   * Type guard to check if a value is a TemplateStringsArray.
   *
   * @param value - The value to check.
   * @returns True if the value is a TemplateStringsArray, false otherwise.
   */
  export function isTemplateStringsArray(
    value: unknown,
  ): value is TemplateStringsArray;

  /**
   * Determines if a given value is truthy.
   *
   * This function evaluates the provided value and returns a boolean indicating
   * whether the value is considered "truthy". If the value is `undefined` or `null`,
   * the function returns the specified default value.
   *
   * For string values, the function considers the following strings as truthy:
   * - "true"
   * - "1"
   * - "yes"
   * (case insensitive and trimmed)
   *
   * @param value - The value to evaluate.
   * @param defaultValue - The default boolean value to return if the value is `undefined` or `null`. Defaults to `false`.
   * @returns `true` if the value is considered truthy, otherwise `false`.
   */
  export function isTruthy(value: unknown, defaultValue?: boolean): boolean;

  /**
   * Checks if the given value is an indexable record (aka object)
   *
   * @param check - The value to check.
   * @returns True if the value is an object, otherwise false.
   */
  export function isRecord(check: unknown): check is Record<string, unknown>;

  /**
   * A unique symbol used for type branding.
   */
  export const TypeBrandSymbol: unique symbol;

  /**
   * Checks if the given value is type branded with the specified brand.
   *
   * @param check - The value to check.
   * @param brand - The brand symbol to check against.
   * @returns True if the value is type branded with the specified brand, otherwise false.
   */
  export const isTypeBranded: <TResult>(
    check: unknown,
    brand: symbol,
  ) => check is TResult;

  /**
   * Result type for categorized promises.
   */
  type CategorizedPromiseResult<T> = {
    fulfilled: Array<T>;
    rejected: Array<unknown>;
    pending: Array<Promise<T>>;
  };

  /**
   * Waits for all promises to settle and categorizes their results.
   *
   * @param promises - An array of promises to wait for.
   * @param timeoutMs - The timeout duration in milliseconds.
   * @returns An object categorizing the promises into fulfilled, rejected, and pending.
   */
  export const getResolvedPromises: <T>(
    promises: Promise<T>[],
    timeoutMs?: number,
  ) => Promise<CategorizedPromiseResult<T>>;
}

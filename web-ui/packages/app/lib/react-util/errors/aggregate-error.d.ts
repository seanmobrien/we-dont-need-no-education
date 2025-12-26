/**
 * @fileoverview Aggregate error class that encapsulates multiple errors.
 * @module aggregate-error
 */

declare module 'lib/react-util/errors/aggregate-error' {
  /**
   * Represents an aggregate error that encapsulates multiple errors.
   *
   * This class extends the built-in `Error` class to provide a way to handle
   * multiple errors as a single error instance. It includes methods for
   * constructing aggregate error messages, checking if an error is an instance
   * of `AggregateError`, and iterating over the contained errors.
   *
   * @example
   * ```typescript
   * const error1 = new Error("First error");
   * const error2 = new Error("Second error");
   * const aggregateError = new AggregateError(["Primary error", error1, error2]);
   *
   * console.log(aggregateError.message);
   * // Output:
   * // Primary error
   * // First error
   * // Second error
   *
   * for (const error of aggregateError) {
   *   console.log(error.message);
   * }
   * // Output:
   * // First error
   * // Second error
   * ```
   */
  export class AggregateError extends Error {
    /**
     * Checks if the given error is an instance of AggregateError.
     * @param e - The error to check.
     * @returns True if the error is an instance of AggregateError, false otherwise.
     */
    public static isAggregateError(e: unknown): e is AggregateError;

    /**
     * Creates an instance of `AggregateError` from an array of `Error` objects.
     *
     * @param errors - An array of `Error` objects to aggregate.
     * @returns An instance of `AggregateError` containing the provided errors.
     */
    public static fromErrors(errors: Error[]): AggregateError;

    /**
     * Creates an instance of AggregateError.
     *
     * @param messageOrError - The main error message or an Error object.
     * @param errors - Additional Error objects.
     */
    constructor(...args: [string | Error, ...Error[]]);

    /**
     * Index signature for accessing errors by numeric index.
     */
    [index: number]: Error;

    /**
     * Gets the number of errors in the aggregate error.
     *
     * @returns {number} The count of errors.
     */
    public get count(): number;

    /**
     * Retrieves the error at the specified index.
     *
     * @param index - The index of the error to retrieve.
     * @returns The error at the specified index.
     */
    public get(index: number): Error;

    /**
     * Returns an array of all errors in the aggregate error.
     *
     * @returns {Error[]} An array of the errors.
     */
    public all(): Error[];

    /**
     * Converts the aggregate error to a string representation.
     *
     * @returns {string} The error message as a string.
     */
    public toString(): string;
  }
}

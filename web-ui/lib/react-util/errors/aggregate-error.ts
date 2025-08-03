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
  public static isAggregateError(e: unknown): e is AggregateError {
    return e instanceof AggregateError;
  }

  /**
   * Constructs an aggregate error message from a given message or error and a list of errors.
   *
   * @param messageOrError - A string message or an Error object that represents the primary error.
   * @param errors - An array of Error objects to be included in the aggregate error message.
   * @returns A formatted string that combines the primary message or error with the messages of the provided errors.
   */
  private static buildMessage(
    messageOrError: string | Error,
    errors: Error[],
  ): string {
    return messageOrError instanceof Error
      ? `An aggregate error has occurred:\n${[
          messageOrError,
          ...(errors ?? []),
        ].join('\n')}`
      : `${messageOrError}\n${errors.map((e) => e.message).join('\n')}`;
  }

  /**
   * Creates an instance of `AggregateError` from an array of `Error` objects.
   *
   * @param errors - An array of `Error` objects to aggregate.
   * @returns An instance of `AggregateError` containing the provided errors.
   */
  public static fromErrors(errors: Error[]): AggregateError {
    return new AggregateError(...[errors[0], ...(errors.slice(1) ?? [])]);
  }

  /**
   * Creates an instance of AggregateError.
   *
   * @param messageOrError - The main error message or an Error object.
   * @param errors - Additional Error objects.
   */
  constructor(...[messageOrError, ...errors]: [string | Error, ...Error[]]) {
    super(AggregateError.buildMessage(messageOrError, errors));
    this.name = 'AggregateError';
    this.#errors =
      typeof messageOrError == 'object'
        ? [messageOrError, ...errors]
        : [...errors];

    errors.forEach((error) => {
      console.log('in aggregateerror');
      if (error instanceof Error) {
        console.log(error.message);
        console.log(error.stack);        
      }
    });
    
  }

  [index: number]: Error;

  /**
   * A private readonly array of Error objects.
   * This property stores the collection of errors.
   */
  readonly #errors: Error[];

  /**
   * Gets the number of errors in the aggregate error.
   *
   * @returns {number} The count of errors.
   */
  public get count(): number {
    return this.#errors.length;
  }

  /**
   * Retrieves the error at the specified index.
   *
   * @param index - The index of the error to retrieve.
   * @returns The error at the specified index.
   */
  public get(index: number): Error {
    return this.#errors[index];
  }

  /**
   * Returns an array of all errors in the aggregate error.
   *
   * @returns {Error[]} An array of the errors.
   */
  public all(): Error[] {
    return [...this.#errors];
  }

  /**
   * Converts the aggregate error to a string representation.
   *
   * @returns {string} The error message as a string.
   */
  public toString(): string {
    return this.message;
  }
}

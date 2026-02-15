/**
 * @module ValidationError
 *
 * This module provides a `ValidationError` class that extends the built-in `Error` class to represent errors that occur during data validation.
 * It includes options for specifying details about the validation error, such as the field that caused the error, the value that failed validation,
 * the expected value or condition, a human-readable explanation of the failure, and the source of the error.
 *
 * The module also provides utility methods to check if an error is an instance of `ValidationError` and to build a validation error message from the given options.
 *
 * @example
 * ```typescript
 * import { ValidationError, ValidationErrorOptions } from './validation-error';
 *
 * const options: ValidationErrorOptions = {
 *   field: 'username',
 *   value: 'invalid_user',
 *   expected: 'a valid username',
 *   reason: 'Username contains invalid characters',
 *   source: 'UserValidator'
 * };
 *
 * const error = new ValidationError(options);
 *
 * if (ValidationError.isValidationError(error)) {
 *   console.error(error.message);
 * }
 * ```
 * @example
 * ```typescript
 *
 * const error = new ValidationError('Username contains invalid characters');
 *
 * if (ValidationError.isValidationError(error)) {
 *   console.error(error.message);
 * }
 * ```
 */

/**
 * A unique symbol used to brand the `ValidationError` class instances.
 */
const brandValidationError: symbol = Symbol('ValidationError');

/**
 * Options for specifying details about a validation error.
 *
 * @property {string} [field] - The name of the field that caused the validation error.
 * @property {unknown} [value] - The value that failed validation.
 * @property {unknown} [expected] - The expected value or condition that the value failed to meet.
 * @property {string} [reason] - A human-readable explanation of why the validation failed.
 * @property {string} [source] - The source of the validation error, such as the function or module where it occurred.
 */
export type ValidationErrorOptions = {
  field?: string;
  value?: unknown;
  expected?: unknown;
  reason?: string;
  source?: string;
};

/**
 * Represents a validation error that occurs during data validation.
 * Extends the built-in `Error` class.
 */
export class ValidationError extends Error {
  /**
   * Checks if the given error is an instance of `ValidationError`.
   *
   * @param {unknown} e - The error to check.
   * @returns {boolean} `true` if the error is an instance of `ValidationError`, otherwise `false`.
   */
  static isValidationError(e: unknown): e is ValidationError {
    return (
      typeof e === 'object' &&
      e !== null &&
      'cause' in e &&
      (e as ValidationError).cause === brandValidationError
    );
  }

  /**
   * Builds a validation error message from the given options.
   *
   * @param {ValidationErrorOptions} options - The options to build the message from.
   * @returns {string} The constructed validation error message.
   */
  static buildMessage(options: ValidationErrorOptions): string {
    const { field, value, expected, reason, source } = options;
    return [
      field ? `Field '${field}'` : 'Validation error',
      value ? `Value: ${JSON.stringify(value)}` : '',
      expected ? `Expected: ${JSON.stringify(expected)}` : '',
      reason ? `Reason: ${reason}` : '',
      source ? `Source: ${source}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  #field: string;
  #value: unknown;
  #expected: unknown;
  #reason: string;
  #source: string;
  [Symbol.toStringTag]: string = 'ValidationError';
  /**
   * Constructs a new instance of `ValidationError`.
   *
   * @param {string | ValidationErrorOptions} message - The error message or options to build the message from.
   * @param {ValidationErrorOptions} [options] - Additional options for the validation error.
   */
  constructor(
    message: string | ValidationErrorOptions,
    options?: ValidationErrorOptions
  ) {
    super(
      typeof message === 'string'
        ? message
        : ValidationError.buildMessage(message),
      { cause: brandValidationError }
    );
    this.name = 'ValidationError';
    this.#field = options?.field ?? '';
    this.#value = options?.value ?? '';
    this.#expected = options?.expected ?? '';
    this.#reason = options?.reason ?? '';
    this.#source = options?.source ?? '';
    this[Symbol.toStringTag] = this.message;
  }

  /**
   * Gets the field associated with the validation error.
   *
   * @returns {string} The field associated with the validation error.
   */
  get field(): string {
    return this.#field;
  }

  /**
   * Gets the value that caused the validation error.
   *
   * @returns {unknown} The value that caused the validation error.
   */
  get value(): unknown {
    return this.#value;
  }

  /**
   * Gets the expected value for the validation.
   *
   * @returns {unknown} The expected value for the validation.
   */
  get expected(): unknown {
    return this.#expected;
  }

  /**
   * Gets the reason for the validation error.
   *
   * @returns {string} The reason for the validation error.
   */
  get reason(): string {
    return this.#reason;
  }

  /**
   * Gets the source of the validation error.
   *
   * @returns {string} The source of the validation error.
   */
  get source(): string {
    return this.#source;
  }
}

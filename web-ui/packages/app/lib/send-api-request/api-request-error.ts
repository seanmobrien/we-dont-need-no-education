/**
 * A unique symbol to identify API request errors.
 */
const apiRequestError: unique symbol = Symbol('apiRequest');

/**
 * Represents an error that occurs during an API request.
 * Extends the built-in `Error` class to include the response object.
 */
export class ApiRequestError extends Error {
  /**
   * Type guard to check if an error is an instance of `ApiRequestError`.
   * @param error - The error to check.
   * @returns `true` if the error is an instance of `ApiRequestError`, otherwise `false`.
   */
  static isApiRequestError(error: unknown): error is ApiRequestError {
    return (
      error instanceof Error &&
      '__brand' in error &&
      error.__brand === apiRequestError
    );
  }

  /**
   * The response object associated with the API request error.
   */
  readonly #response: Response;

  /**
   * A unique brand symbol to identify instances of `ApiRequestError`.
   */
  __brand: symbol = apiRequestError;

  /**
   * Creates an instance of `ApiRequestError`.
   * @param message - The error message.
   * @param response - The response object associated with the error.
   */
  constructor(message: string, response: Response) {
    super(message);
    this.#response = response;
  }

  /**
   * Gets the response object associated with the API request error.
   */
  get response(): Response {
    return this.#response;
  }
}

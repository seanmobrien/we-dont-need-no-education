/**
 * API request error class
 * @module @/lib/send-api-request/api-request-error
 */

declare module '@/lib/send-api-request/api-request-error' {
  /**
   * Represents an error that occurs during an API request.
   * Extends the built-in `Error` class to include the response object.
   *
   * This error is branded with a unique symbol to enable reliable type checking
   * across module boundaries and after serialization/deserialization.
   *
   * @example
   * ```typescript
   * try {
   *   const data = await apiRequest({ url, method: 'GET' });
   * } catch (error) {
   *   if (ApiRequestError.isApiRequestError(error)) {
   *     console.error('API Error:', error.message);
   *     console.error('Status:', error.response.status);
   *   }
   * }
   * ```
   */
  export class ApiRequestError extends Error {
    /**
     * Type guard to check if an error is an instance of `ApiRequestError`.
     *
     * @param error - The error to check
     * @returns `true` if the error is an instance of `ApiRequestError`, otherwise `false`
     */
    static isApiRequestError(error: unknown): error is ApiRequestError;

    /**
     * A unique brand symbol to identify instances of `ApiRequestError`.
     */
    __brand: symbol;

    /**
     * Creates an instance of `ApiRequestError`.
     *
     * @param message - The error message
     * @param response - The response object associated with the error
     */
    constructor(message: string, response: Response);

    /**
     * Gets the response object associated with the API request error.
     */
    get response(): Response;
  }
}

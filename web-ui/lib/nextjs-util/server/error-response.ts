import { isError } from "../../react-util/_utility-methods";

/**
 * ErrorResponse
 *
 * A utility class for generating standardized JSON error responses in Next.js API routes or server functions.
 *
 * ## Overview
 *
 * `ErrorResponse` extends the native `Response` class and provides a convenient way to return error responses with a consistent JSON structure:
 *
 *   {
 *     "error": "Error message",
 *     "status": 500
 *   }
 *
 * It supports initialization from a status code, an Error object, or another Response, and allows for a custom message override.
 *
 * @example
 * // In an API route:
 * import { ErrorResponse } from '@/lib/nextjs-util/error-response';
 *
 * export async function GET() {
 *   try {
 *     // ...
 *   } catch (err) {
 *     return new ErrorResponse(err);
 *   }
 * }
 *
 * // With custom status and message
 * return new ErrorResponse(404, 'Not found');
 *
 * ## JSON Structure
 *
 * The response body is always JSON:
 *   {
 *     "error": "...",
 *     "status": ...
 *   }
 *
 * ## Notes
 * - The response always has `Content-Type: application/json`.
 * - Useful for error handling in Next.js API/app routes, middleware, or server actions.
 */
export class ErrorResponse extends Response {
  /**
   * Create a new ErrorResponse.
   *
   * @param statusOrError - Can be a status code (number), an Error object, a Response, or any unknown value.
   * @param message - Optional custom error message. If not provided, a default message is used or derived from the error/status.
   *
   * ### Behavior
   * - If `statusOrError` is a number, it is used as the HTTP status code.
   * - If `statusOrError` is a `Response`, its status and statusText are used.
   * - If `statusOrError` is an Error (as determined by `isError`), its message is used.
   * - Otherwise, defaults to status 500 and a generic error message.
   */
  constructor(statusOrError?: unknown, message?: string) {
    let status = 500;
    let errorMessage: string = message ?? 'An error occurred';
    if (typeof statusOrError === 'number') {
      status = statusOrError;
    } else if (statusOrError instanceof Response) {
      status = statusOrError.status;
      errorMessage = statusOrError.statusText || errorMessage;
    } else if (isError(statusOrError)) {
      errorMessage = statusOrError.message || errorMessage;
    } 

    super(JSON.stringify({ error: errorMessage, status }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
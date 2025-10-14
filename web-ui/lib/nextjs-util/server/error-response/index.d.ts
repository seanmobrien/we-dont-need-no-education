/**
 * error-response
 *
 * Utilities for producing consistent JSON error responses in Next.js server code.
 *
 * - Normalizes a wide range of inputs (string, number, Error, Response, options object)
 * - Provides a stable Response payload shape
 * - Derives sensible defaults and metadata (status, message, cause, source)
 *
 * For usage examples, see the README:
 * - ./docs/lib/nextjs-util/error-response.md
 */

declare module '@/lib/nextjs-util/server/error-response/index' {
  /**
   * Options that can be used to influence how an error response is produced.
   *
   * @property cause - The originating error (or any value). If an `Error` is provided and no
   *                   message is present, the message falls back to `cause.message`.
   * @property status - HTTP status code. Defaults to 500 when omitted.
   * @property message - Error message to present to clients.
   * @property source - Optional string indicating the logical source of the error.
   */
  export type ErrorResponseOptions = {
    cause?: unknown;
    status?: number;
    message?: string;
    source?: string;
  };

  /**
   * Combine two inputs into a normalized error shape.
   *
   * Rules:
   * - Status: prefers explicit numbers, defaults to 500
   * - Message: derives from inputs; if both inputs provide a message, they are combined
   *            as "message1 - message2"; falls back to "An error occurred"
   * - Cause: if provided, is stringified; `Error` becomes its `.name`
   * - Source: explicit `source`, or extracted from `cause.source` when present
   *
   * @param first - Primary input: string | number | Error | Response | ErrorResponseOptions | unknown
   * @param second - Secondary input with the same accepted types; overrides where present
   * @returns Normalized `{ status, message, cause?, source? }`
   *
   * @example
   * parseResponseOptions('Auth failed', { status: 401, source: 'auth' })
   * // => { status: 401, message: 'Auth failed', source: 'auth' }
   *
   * @example
   * parseResponseOptions(new Error('Boom'), 'Custom')
   * // => { status: 500, message: 'Boom - Custom', cause: 'Error' }
   *
   * For more end-to-end examples, see {@link ./README.md}.
   */
  export const parseResponseOptions: (
    first?: unknown,
    second?: unknown,
  ) => { status: number; message: string; cause?: string; source?: string };

  /**
   * Create a errorResponseFactory.
   *
   * @param statusOrError - A flexible input: string | number | Error | Response | ErrorResponseOptions | unknown
   * @param messageOrOptions - Optional second input of the same accepted types; values override the first
   *
   * ### Behavior
   * - If `statusOrError` is a number, it is used as the HTTP status code.
   * - If `statusOrError` is a `Response`, its status and statusText are used.
   * - If `statusOrError` is an Error (as determined by `isError`), its message is used.
   * - Otherwise, defaults to status 500 and a generic error message.
   */
  export const errorResponseFactory: (
    statusOrError?: unknown,
    messageOrOptions?: unknown,
  ) => Response;
}

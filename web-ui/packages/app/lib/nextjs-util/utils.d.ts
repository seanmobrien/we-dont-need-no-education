import { LikeNextRequest, LikeNextResponse } from './types';
import { OutgoingMessage } from 'http';

declare module '@/lib/nextjs-util/utils' {
  /**
   * Extracts header values from various types of Next.js request/response objects.
   *
   * This function provides a unified interface for getting header values from different
   * types of Next.js and Node.js HTTP objects, handling the different APIs they expose.
   *
   * @template T - The type of the request/response object
   * @param req - The request or response object to extract headers from
   * @param headerName - The name of the header to retrieve (case-insensitive)
   * @returns The header value, which can be:
   *   - `string | string[] | undefined` for Next.js Request/Response and OutgoingMessage
   *   - `string | string[] | undefined | number` for OutgoingMessage specifically
   *   - `string | null` for IncomingMessage
   *   - `never` for unsupported types
   *
   * @example
   * ```typescript
   * // With Next.js Request
   * const userAgent = getHeaderValue(request, 'user-agent');
   *
   * // With API Response
   * const contentType = getHeaderValue(response, 'content-type');
   *
   * // With Node.js IncomingMessage
   * const authorization = getHeaderValue(req, 'authorization');
   * ```
   */
  export function getHeaderValue(
    req: LikeNextRequest | LikeNextResponse | OutgoingMessage,
    headerName: string,
  ): string | string[] | undefined | number | null;



  /**
   * Creates a deprecated wrapper around a function that emits Node.js deprecation warnings.
   *
   * This utility function wraps an existing function to emit deprecation warnings when called,
   * while preserving the original function's type signature, `this` context, and behavior.
   * The wrapper also modifies the function's toString method to include JSDoc deprecated
   * tags for IDE recognition.
   *
   * @template T - The type of the function being deprecated, must extend (...args: any[]) => any
   * @param fn - The function to deprecate
   * @param message - Custom deprecation message (defaults to a generic message using function name)
   * @param code - Deprecation warning code for categorization (defaults to 'DEP000')
   * @returns A wrapped function that emits warnings and calls the original function
   *
   * @example
   * ```typescript
   * // Basic usage
   * const oldAdd = deprecate(
   *   function add(a: number, b: number): number {
   *     return a + b;
   *   },
   *   'Use the new math library instead',
   *   'DEP001'
   * );
   *
   * // With method binding
   * class Calculator {
   *   multiply(a: number, b: number): number {
   *     return a * b;
   *   }
   * }
   *
   * const calc = new Calculator();
   * const deprecatedMultiply = deprecate(
   *   calc.multiply.bind(calc),
   *   'multiply method will be removed in v2.0'
   * );
   *
   * // Usage emits: DeprecationWarning: multiply method will be removed in v2.0
   * const result = deprecatedMultiply(5, 3); // returns 15
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function deprecate<T extends (...args: any[]) => any>(
    fn: T,
    message?: string,
    code?: string,
  ): T;
}

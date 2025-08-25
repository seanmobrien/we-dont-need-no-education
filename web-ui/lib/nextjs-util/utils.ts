import { IncomingMessage, OutgoingMessage, ServerResponse } from 'http';
import {
  isNextApiRequest,
  isNextRequest,
  isNextResponse,
  isNextApiResponse,
} from './guards';
import { LikeNextRequest, LikeNextResponse } from './types';
import { isPromise } from '../typescript';
import { getStackTrace } from './get-stack-trace';

/**
 * Type definition for objects that have a headers property of type Headers.
 * This is used for type narrowing in header value extraction.
 */
type HeadersLikeNextRequestOrResponse = {
  headers: Headers;
};

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
export const getHeaderValue = (
  req: LikeNextRequest | LikeNextResponse | OutgoingMessage,
  headerName: string,
): typeof req extends infer TActual
  ? TActual extends HeadersLikeNextRequestOrResponse
    ? string | string[] | undefined
    : TActual extends OutgoingMessage
      ? string | string[] | undefined | number
      : TActual extends IncomingMessage
        ? string | null
        : TActual extends ServerResponse
          ? string | string[] | undefined
          : never
  : never => {
  if (isNextApiRequest(req) || req instanceof IncomingMessage) {
    return req.headers[headerName.toLowerCase()];
  }
  if (isNextRequest(req) || isNextResponse(req)) {
    return req.headers.get(headerName);
  }
  if (isNextApiResponse(req) || req instanceof OutgoingMessage) {
    return req.getHeader(headerName);
  }
  return null;
};

/**
 * Extracts and resolves parameters from a Next.js request object.
 * 
 * This function handles both synchronous and asynchronous parameter extraction,
 * which is common in Next.js App Router where params can be a Promise.
 * 
 * @template T - The expected type of the parameters object
 * @param req - An object containing a params property that can be either T or Promise<T>
 * @returns A Promise that resolves to the parameters object of type T
 * @throws {Error} When no params are found in the request object
 * 
 * @example
 * ```typescript
 * // In a Next.js App Router page or API route
 * interface PageParams {
 *   id: string;
 *   category: string;
 * }
 * 
 * export default async function Page({ params }: { params: Promise<PageParams> }) {
 *   const resolvedParams = await extractParams({ params });
 *   console.log(resolvedParams.id); // string
 * }
 * 
 * // With synchronous params (Next.js Pages Router)
 * const syncParams = await extractParams({ params: { id: '123' } });
 * ```
 */
export const extractParams = async <T extends object>(req: {
  params: T | Promise<T>;
}): Promise<T> => {
  if (!req.params) {
    throw new Error('No params found');
  }
  if (isPromise(req.params)) {
    return await req.params;
  }
  return req.params;
};

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
export const deprecate =  <T extends (...args: any[]) => any>(fn: T, message = `The ${fn.name} function is deprecated.`, code = 'DEP000') => {
  const stack = getStackTrace({ skip: 2 });
  const deprecatedFn = function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> {
    process.emitWarning(`${message}\nStack Trace:\n${stack}`, {
      code,
      type: 'DeprecationWarning'
    });
    return fn.apply(this, args);
  } as T;
  
  // Add a JSDoc @deprecated tag dynamically for IDE recognition
  Object.defineProperty(deprecatedFn, 'toString', {
    value: () => `/ ** @deprecated ${message} * /\n${fn.toString()}`,
  });
  
  return deprecatedFn;
};


/**
 * @file error-like.ts
 * @description
 *   Utilities for normalizing, branding, and type-guarding error-like objects in TypeScript/JavaScript.
 *   This module provides a lightweight, type-safe way to work with error values that may be strings,
 *   native Error objects, or plain objects with error-like properties. It is especially useful for
 *   error handling in codebases where errors may come from many sources (e.g., network, user, 3rd-party libs).
 *
 *   - The `ErrorLike` type describes a minimal error shape (message, name, stack, cause).
 *   - The `isErrorLike` function is a type guard that checks if a value is an ErrorLike, and brands it for fast future checks.
 *   - The `isStringOrErrorLike` function checks if a value is a non-empty string or ErrorLike.
 *   - The `asErrorLike` function converts a string or ErrorLike into a branded ErrorLike object.
 *
 * @example
 *   import { isErrorLike, asErrorLike, isStringOrErrorLike } from '@/lib/react-util/errors/error-like';
 *
 *   function handleError(err: unknown) {
 *     if (isErrorLike(err)) {
 *       // Safe to access err.message, err.name, etc.
 *       console.error(err.message);
 *     } else if (isStringOrErrorLike(err)) {
 *       const normalized = asErrorLike(err);
 *       // Now normalized is an ErrorLike
 *     }
 *   }
 *
 * @exports
 *   - ErrorLike: Minimal error object type
 *   - StringOrErrorLike: string | ErrorLike union
 *   - isErrorLike: Type guard for ErrorLike
 *   - isStringOrErrorLike: Type guard for string or ErrorLike
 *   - asErrorLike: Normalizes a value to ErrorLike
 */

/**
 * A unique symbol used as a brand to identify values that are "error-like".
 * This symbol can be used to tag objects or types to distinguish them from other values,
 * enabling type-safe checks for error-like structures within the codebase.
 *
 * @internal
 */
const isErrorLikeBrand: unique symbol = Symbol('mct2k.utils.error-like.brand');

/**
 * Represents a minimal, serializable error-like object.
 * This is useful for normalizing errors that may not be real Error instances.
 *
 * @property message - The error message (required)
 * @property name - The error name/type (optional)
 * @property stack - The stack trace, if available (optional)
 * @property cause - The underlying cause, if any (optional)
 * @property [isErrorLikeBrand] - Internal brand for fast type checks (do not set manually)
 */
export type ErrorLike = {
  message: string;
  name: string;
  stack?: string;
  cause?: unknown;
  source?: string; // Optional source for the error, e.g., filename
  line?: number; // Optional line number for the error
  column?: number; // Optional column number for the error  
  [isErrorLikeBrand]?: true;
};

/**
 * Optional values that can be passed to {@link asErrorLike} to customize the resulting ErrorLike object.
 * These options allow you to specify additional properties like line number, column, and filename,
 * which will be used to build stack trace data if it is not already present.
 */
export type AsErrorLikeOptions = Partial<Omit<ErrorLike, 'message'>> & {
  /**
   * The line number where the error occurred, used to build a minimal stack trace if needed.
   */
  line?: number;
  /**
   * The column number where the error occurred, used to build a minimal stack trace if needed.
   */
  col?: number;
  /**
   * The filename where the error occurred, used to build a minimal stack trace if needed.
   * This is useful for debugging and tracing errors back to their source.
   */
  filename?: string;  
};

/**
 * A value that is either a string or an ErrorLike object.
 * Useful for APIs that accept or return either error messages or error objects.
 */
export type StringOrErrorLike = string | ErrorLike;

/**
 * Type guard to check if a value is an ErrorLike object.
 *
 * - Returns true if the value is an object with a string message property and (optionally) name, stack, and cause.
 * - Brands the object for fast future checks.
 *
 * @param value - The value to check
 * @returns True if value is ErrorLike, false otherwise
 */
export const isErrorLike = (value: unknown): value is ErrorLike => {
  if (typeof value !== 'object' || !value) {
    return false;
  }
  const castToErrorLike = value as ErrorLike;
  if (castToErrorLike[isErrorLikeBrand] === true) {
    // If it already has the brand, we can return true immediately
    return true;
  }
  const check = typeof castToErrorLike.message === 'string' &&
        (castToErrorLike.name === undefined ||
          typeof castToErrorLike.name === 'string') &&
        (castToErrorLike.stack === undefined ||
          typeof castToErrorLike.stack === 'string') &&
        (castToErrorLike.cause === undefined ||
          typeof castToErrorLike.cause === 'object');
  if (check) {
    return true;
  }
  return false;
};

/**
 * Type guard to check if a value is a non-empty string or an ErrorLike object.
 *
 * @param value - The value to check
 * @returns True if value is a non-empty string or ErrorLike, false otherwise
 */
export const isStringOrErrorLike = (value: unknown): value is StringOrErrorLike =>
  (typeof value === 'string' && !!value) || isErrorLike(value);



const nodeInspectCustom = Symbol.for('nodejs.util.inspect.custom');


type ErrorLikeOptions = Partial<Omit<ErrorLike, 'message'> & Omit<ErrorEventInit, 'message' | 'error'>>;

class ErrorLikeInstance implements ErrorLike {
  message: string;
  name: string;
  stack?: string;
  cause?: unknown;

  constructor(message: string, options: ErrorLikeOptions = {}) {
    this.message = message;
    this.name = options.name ?? 'Error';
    this.stack = options.stack;
    this.cause = options.cause;
    if (!this.stack && options.filename) {
      /* No stack trace provided, so we build a minimal one
  Stack trace is formatted as (Name): (message)\n\tat (function) (<filename>:<line>:<column>)
  Error: kaboom
      at window.fnOne (<anonymous>:1:30)
      at <anonymous>:1:16 */
      this.stack = `${this.name}: ${this.message}\n\tat (${options.filename}:${options.lineno ?? 1}:${options.colno ?? 0})`;
    }
  }
  get source(): string | undefined {
    return ErrorLikeInstance.extractSourceFromStack(this.stack);
  }
  get line(): number {
    const ret = ErrorLikeInstance.extractLineAndColumnFromStack(this.stack);
    return ret ? ret[0] : 0;
  }
  get column(): number {
    const ret = ErrorLikeInstance.extractLineAndColumnFromStack(this.stack);
    return ret ? ret[1] : 0;
  }
  get [isErrorLikeBrand](): true {
    return true;
  }
  toString() {
    return `${this.name ? `${this.name}: ` : ''}${this.message}`;
  }

  [nodeInspectCustom](): string {
    return this.stack ? this.stack : this.toString();
  }

  static #extractStackFrameRegex =
    /at ([\w$.<>]+ )?\((.*[\\/])?([^\\/()]+):(\d+):(\d+)\)/;
  static readonly #ExtractStackFrameGroups = {
    Function: 2 as const,
    Source: 3 as const,
    Line: 4 as const,
    Column: 5 as const,
  } as const;

  static extractFunctionFromStack(stack: string | undefined): string | undefined {
    const stackLine = stack?.split('\n')?.at(1);
    if (!stackLine) {
      return undefined;
    } 
    const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
    return match ? match[ErrorLikeInstance.#ExtractStackFrameGroups.Function] : undefined;
  }
  static extractSourceFromStack(stack: string | undefined): string | undefined {
    const stackLine = stack?.split('\n')?.at(1);
    if (!stackLine) {
      return undefined;
    }
    const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
    return match ? match[ErrorLikeInstance.#ExtractStackFrameGroups.Source] : undefined;
  }
  static extractLineAndColumnFromStack(
    stack: string | undefined,
  ): [number, number] | undefined {
    const stackLine = stack?.split('\n')?.at(1);
    if (!stackLine) {
      return undefined;
    }
    const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
    return match ? [Number(match[ErrorLikeInstance.#ExtractStackFrameGroups.Line]), Number(match[ErrorLikeInstance.#ExtractStackFrameGroups.Column])] : undefined;
  }
  static errorLikeProxyFactory(inner: ErrorLike): ErrorLike {
    // If we're branded we are ErrorLike already
    if (inner[isErrorLikeBrand]) {
      return inner;
    }
    // Otherwise, create a proxy to enhance property access
    return new Proxy(inner, {
      get(target, prop, receiver) {
        let ret: unknown = undefined;
        // Intercept property access
        if (prop in target) {
          ret = Reflect.get(target, prop, receiver);
        }
        // If the property is not found, return a custom message
        if (ret === undefined) {
          switch (prop) {
            case isErrorLikeBrand:
              return true;
            case 'source':
              ret = ErrorLikeInstance.extractSourceFromStack(target.stack);
              break;
            case 'line':
              const line = ErrorLikeInstance.extractLineAndColumnFromStack(
                target.stack,
              );
              ret = line ? line[0] : 0;
              break;
            case 'column':
              const column = ErrorLikeInstance.extractLineAndColumnFromStack(
                target.stack,
              );
              ret = column ? column[1] : 0;
              break;
            default:
              ret = undefined;
              break;
          }
        }
        return ret;
      },
    });
  }
}

/** 
 * Converts a string or ErrorLike value into a branded ErrorLike object.
 *
 * - If given a string, returns a new ErrorLike with the provided name (default: 'ErrorLike').
 * - If given an ErrorLike, brands it and returns it.
 *
 * @param value - The string or ErrorLike to normalize
 * @param options.name - Optional name for the error (default: 'ErrorLike')
 * @returns A branded ErrorLike object
 */
export const asErrorLike = (value: unknown, options: ErrorLikeOptions = {}): ErrorLike | undefined => {
  if (!value) {
    return undefined;
  }
  if (isErrorLike(value)) {
    return ErrorLikeInstance.errorLikeProxyFactory(value);
  } 
  if (typeof value === 'object') {
    const { message, ...rest } = value as { message?: string; [key: string]: unknown };
    return new ErrorLikeInstance(message ?? 'Unexpected error', {
      ...(options ?? {}),
      ...rest,
    });
  }
  return new ErrorLikeInstance(String(value), options); 
};
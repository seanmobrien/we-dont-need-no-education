const isErrorLikeBrand: unique symbol = Symbol('mct2k.utils.error-like.brand');

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

export type AsErrorLikeOptions = Partial<Omit<ErrorLike, 'message'>> & {
  line?: number;
  col?: number;
  filename?: string;
};

export type StringOrErrorLike = string | ErrorLike;

export const isErrorLike = (value: unknown): value is ErrorLike => {
  if (typeof value !== 'object' || !value) {
    return false;
  }
  const castToErrorLike = value as ErrorLike;
  if (castToErrorLike[isErrorLikeBrand] === true) {
    // If it already has the brand, we can return true immediately
    return true;
  }
  const check =
    typeof castToErrorLike.message === 'string' &&
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

export const isStringOrErrorLike = (
  value: unknown,
): value is StringOrErrorLike =>
  (typeof value === 'string' && !!value) || isErrorLike(value);

const nodeInspectCustom = Symbol.for('nodejs.util.inspect.custom');

type ErrorLikeOptions = Partial<
  Omit<ErrorLike, 'message'> & Omit<ErrorEventInit, 'message' | 'error'>
>;

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

  static extractFunctionFromStack(
    stack: string | undefined,
  ): string | undefined {
    const stackLine = stack?.split('\n')?.at(1);
    if (!stackLine) {
      return undefined;
    }
    const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
    return match
      ? match[ErrorLikeInstance.#ExtractStackFrameGroups.Function]
      : undefined;
  }
  static extractSourceFromStack(stack: string | undefined): string | undefined {
    const stackLine = stack?.split('\n')?.at(1);
    if (!stackLine) {
      return undefined;
    }
    const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
    return match
      ? match[ErrorLikeInstance.#ExtractStackFrameGroups.Source]
      : undefined;
  }
  static extractLineAndColumnFromStack(
    stack: string | undefined,
  ): [number, number] | undefined {
    const stackLine = stack?.split('\n')?.at(1);
    if (!stackLine) {
      return undefined;
    }
    const match = ErrorLikeInstance.#extractStackFrameRegex.exec(stackLine);
    return match
      ? [
          Number(match[ErrorLikeInstance.#ExtractStackFrameGroups.Line]),
          Number(match[ErrorLikeInstance.#ExtractStackFrameGroups.Column]),
        ]
      : undefined;
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

export const asErrorLike = (
  value: unknown,
  options: ErrorLikeOptions = {},
): ErrorLike | undefined => {
  if (!value) {
    return undefined;
  }
  if (isErrorLike(value)) {
    return ErrorLikeInstance.errorLikeProxyFactory(value);
  }
  if (typeof value === 'object') {
    const { message, ...rest } = value as {
      message?: string;
      [key: string]: unknown;
    };
    return new ErrorLikeInstance(message ?? 'Unexpected error', {
      ...(options ?? {}),
      ...rest,
    });
  }
  return new ErrorLikeInstance(String(value), options);
};

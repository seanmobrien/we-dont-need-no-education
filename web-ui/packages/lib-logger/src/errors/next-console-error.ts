const nextDigestSymbol = Symbol.for('next.console.error.digest');
const nextConsoleErrorType = Symbol.for('next.console.error.type');

export type NextConsoleErrorType = 'error' | 'warning' | 'info' | 'log';

export type NextConsoleError = Error & {
  [nextDigestSymbol]: string;
  [nextConsoleErrorType]?: NextConsoleErrorType;
  environmentName?: string;
};

export const isConsoleError = (error: unknown): error is NextConsoleError =>
  typeof error === 'object' &&
  !!error &&
  nextDigestSymbol in error &&
  error[nextDigestSymbol] === 'NEXT_CONSOLE_ERROR';

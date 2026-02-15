import { getStackTrace } from '../internal/get-stack-trace';

export class AccessDeniedError extends Error {
  constructor(message?: string) {
    super(message ?? 'Access denied');
    this.name = 'AccessDeniedError';
    this.stack = getStackTrace({ skip: 2 });
  }

  static isAccessDeniedError(error: unknown): error is AccessDeniedError {
    return error instanceof AccessDeniedError;
  }
}

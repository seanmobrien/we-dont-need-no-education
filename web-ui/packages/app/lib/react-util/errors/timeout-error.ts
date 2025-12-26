import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message ?? 'A timeout has occurred');
    this.name = 'TimeoutError';
    this.stack = getStackTrace({ skip: 2 });
  }

  static isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError;
  }
}

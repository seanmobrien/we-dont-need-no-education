export declare const CONNECTION_TIMEOUT_MS: number;
export declare const SEND_TIMEOUT_MS: number;

export interface OperationMetrics {
  startTime: number;
  operation: string;
  messageId?: string | number;
}

export declare class SafeOperation {
  #private;
  constructor(url: string);
  createSafeErrorHandler(
    handler: (error: unknown) => void
  ): (error: unknown) => void;
  createSafeAsyncWrapper<T extends unknown[], R>(
    operationName: string,
    fn: (...args: T) => R | Promise<R>,
    errorHandler: (error: unknown) => void
  ): (...args: T) => Promise<R | void>;
  recordOperation(operation: string, messageId?: string | number): string;
  completeOperation(
    operationId: string,
    status?: 'success' | 'error'
  ): void;
  withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation?: string
  ): Promise<T | import('./timeout-error').TimeoutError>;
}

export declare const createSafeErrorHandler: (
  handler: (error: unknown) => void,
  url?: string
) => (error: unknown) => void;

export declare const createSafeAsyncWrapper: <T extends unknown[], R>(
  operationName: string,
  fn: (...args: T) => R | Promise<R>,
  errorHandler: (error: unknown) => void,
  url?: string
) => (...args: T) => Promise<R | void>;
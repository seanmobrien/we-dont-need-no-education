/**
 * Wrapped logger implementation
 * @module @/lib/logger/wrapped-logger
 */

import type { ILogger } from './types';
declare module '@/lib/logger/wrapped-logger' {
  /**
   * Wrapped logger that provides additional functionality around a base logger.
   */
  export class WrappedLogger implements ILogger {
    constructor(logger: ILogger);

    info(message: string | object, ...args: unknown[]): void;
    error(message: string | object, ...args: unknown[]): void;
    warn(message: string | object, ...args: unknown[]): void;
    debug(message: string | object, ...args: unknown[]): void;
    fatal(message: string | object, ...args: unknown[]): void;
    verbose(message: string | object, ...args: unknown[]): void;
    silly(message: string | object, ...args: unknown[]): void;
    trace(message: string | object, ...args: unknown[]): void;
  }
}

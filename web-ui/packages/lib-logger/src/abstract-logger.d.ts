/**
 * Abstract logger base class
 * @module @compliance-theater/logger/abstract-logger
 */

import type { ILogger } from './types';
declare module '@compliance-theater/logger/abstract-logger' {
  /**
   * Abstract base class for logger implementations.
   */
  export abstract class AbstractLogger implements ILogger {
    abstract info(message: string | object, ...args: unknown[]): void;
    abstract error(message: string | object, ...args: unknown[]): void;
    abstract warn(message: string | object, ...args: unknown[]): void;
    abstract debug(message: string | object, ...args: unknown[]): void;
    abstract fatal(message: string | object, ...args: unknown[]): void;
    abstract verbose(message: string | object, ...args: unknown[]): void;
    abstract silly(message: string | object, ...args: unknown[]): void;
    abstract trace(message: string | object, ...args: unknown[]): void;
  }
}

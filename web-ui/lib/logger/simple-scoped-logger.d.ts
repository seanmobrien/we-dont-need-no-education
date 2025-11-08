/**
 * Simple scoped logger for creating loggers with a specific scope/prefix
 * @module @/lib/logger/simple-scoped-logger
 */

import type { SimpleLogger } from './types';
declare module '@/lib/logger/simple-scoped-logger' {
  /**
   * Creates a simple scoped logger with a specified prefix.
   *
   * @param scope - The scope/prefix to prepend to all log messages
   * @returns A SimpleLogger instance with scoped logging methods
   */
  export const simpleScopedLogger: (scope: string) => SimpleLogger;
}

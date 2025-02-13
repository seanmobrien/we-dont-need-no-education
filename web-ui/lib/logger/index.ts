import pino from 'pino';
import { env, isRunningOnServer } from 'lib/site-util/env';

import type { ILogger } from './logger.d.ts';

let _logger: ILogger;

export type { ILogger };

/**
 * Returns a promise that resolves to an instance of ILogger.
 *
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 */
export const logger = (): Promise<ILogger> =>
  new Promise((resolve) => {
    if (!_logger) {
      if (isRunningOnServer()) {
        _logger = pino<'verbose' | 'silly', false>({
          level: env('LOG_LEVEL_SERVER'),
          name: 'app',
          timestamp: pino.stdTimeFunctions.isoTime,
          customLevels: { verbose: 10000, silly: Number.MAX_SAFE_INTEGER },
          useOnlyCustomLevels: false,
        });
      } else {
        _logger = pino<'verbose' | 'silly', false>({
          level: env('NEXT_PUBLIC_LOG_LEVEL_CLIENT'),
          name: 'app',
          timestamp: pino.stdTimeFunctions.isoTime,
          customLevels: { verbose: 10000, silly: Number.MAX_SAFE_INTEGER },
          useOnlyCustomLevels: false,
        });
      }
      // NOTE: This is to assist with debugging, and should not be left in production
      process.on('warning', (e) =>
        _logger.warn({ message: e.message, stack: e.stack })
      );
    }
    resolve(_logger);
  });

/**
 * Executes a callback function with the provided logger instance.
 *
 * @param cb - A callback function that takes a logger instance as an argument.
 */
export const log = (cb: (l: ILogger) => void) => logger().then(cb);

export { errorLogFactory } from './_utilities';

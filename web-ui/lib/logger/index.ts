import pino from 'pino';
import type { ILogger } from './logger.d.ts';

const _logger = pino<'verbose' | 'silly', false>({
  level: process.env.TraceLevel ?? 'info',
  name: 'app',
  timestamp: pino.stdTimeFunctions.isoTime,
  customLevels: { verbose: 10000, silly: Number.MAX_SAFE_INTEGER },
  useOnlyCustomLevels: false,
});

process.on('warning', (e) =>
  _logger.warn({ message: e.message, stack: e.stack })
);

export type { ILogger };

/**
 * Returns a promise that resolves to an instance of ILogger.
 *
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 */
export const logger = (): Promise<ILogger> => Promise.resolve(_logger);

/**
 * Executes a callback function with the provided logger instance.
 *
 * @param cb - A callback function that takes a logger instance as an argument.
 */
export const log = (cb: (l: ILogger) => void) => cb(_logger);

export { errorLogFactory } from './_utilities';

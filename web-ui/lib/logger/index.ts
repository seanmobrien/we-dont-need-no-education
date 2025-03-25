import pino from 'pino';
import { env, isRunningOnServer } from '@/lib/site-util/env';
import { WrappedLogger } from './wrapped-logger';
import type { ILogger, EventSeverity, LogEventOverloads } from './types';
import { CustomAppInsightsEvent } from './event';

let _logger: ILogger;

export { KnownSeverityLevel } from './constants';
export * from './event';
export type * from './types';
export type { ILogger, EventSeverity };
export { errorLogFactory } from './_utilities';

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
          customLevels: { verbose: 5, silly: 1 },
          useOnlyCustomLevels: false,
        });
      } else {
        const isJest = process.env.JEST_WORKER_ID !== undefined;
        const transport = isJest
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                colorize: true,
              },
            };

        _logger = pino<'verbose' | 'silly', false>({
          level: env('NEXT_PUBLIC_LOG_LEVEL_CLIENT'),
          name: 'app',
          timestamp: pino.stdTimeFunctions.isoTime,
          customLevels: { verbose: 5, silly: 1 },
          useOnlyCustomLevels: false,
          transport,
        });
      }
    }
    resolve(new WrappedLogger(_logger));
  });

/**
 * Executes a callback function with the provided logger instance.
 *
 * @param cb - A callback function that takes a logger instance as an argument.
 */
export const log = (cb: (l: ILogger) => void) => logger().then(cb);

/**
 * @remarks
 * This helper function provides multiple overloads for logging events.
 * @method
 * @name LogEventOverloads#(eventName: string): Promise<ILogger>
 * @description Logs an event with the specified name.
 * @param {string} eventName - The name of the event to log.
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 *
 * @method
 * @name LogEventOverloads#(eventName: string, measurements: Record<string, number>): Promise<ILogger>
 * @description Logs an event with the specified name and measurements.
 * @param {string} eventName - The name of the event to log.
 * @param {Record<string, number>} measurements - A record of measurements associated with the event.
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 *
 * @method
 * @name LogEventOverloads#(severity: EventSeverity, eventName: string): Promise<ILogger>
 * @description Logs an event with the specified severity and name.
 * @param {EventSeverity} severity - The severity level of the event.
 * @param {string} eventName - The name of the event to log.
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 *
 * @method
 * @description Logs an event with the specified severity, name, and measurements.
 * @param {EventSeverity} severity - The severity level of the event.
 * @param {string} eventName - The name of the event to log.
 * @param {Record<string, number>} measurements - A record of measurements associated with the event.
 * @returns {Promise<ILogger>} A promise that resolves to an ILogger instance.
 *
 * @example
 * ```typescript
 * logEvent('UserLoggedIn', { userId: 123 });
 * logEvent('error', 'ErrorOccurred');
 * ```
 */
export const logEvent: LogEventOverloads = (
  severityOrEvent: EventSeverity | string,
  eventOrMeasurements?: string | Record<string, number>,
  measurements?: Record<string, number>,
) => {
  let severity: EventSeverity = 'info';
  let event: CustomAppInsightsEvent;
  if (measurements) {
    // Only one thing we can be if the third param has a value
    event = new CustomAppInsightsEvent(
      eventOrMeasurements as string,
      measurements,
    );
    severity = severityOrEvent as EventSeverity;
  } else if (eventOrMeasurements) {
    // If the second param is a string, we can assume it's an event name
    if (typeof eventOrMeasurements === 'string') {
      event = new CustomAppInsightsEvent(eventOrMeasurements);
      severity = severityOrEvent as EventSeverity;
    } else {
      // Otherwise, we can assume it's a measurement
      event = new CustomAppInsightsEvent('measurement', eventOrMeasurements);
    }
  } else {
    event = new CustomAppInsightsEvent(severityOrEvent);
  }
  return log((l) => l[severity](event));
};

import pino from 'pino';
import { env, isRunningOnServer } from '@compliance-theater/env';
import { WrappedLogger } from './wrapped-logger';
import type { ILogger, EventSeverity, LogEventOverloads } from './types';
import { CustomAppInsightsEvent } from './event';
import { emitSendCustomEvent } from './log-emitter';

let _logger: ILogger;

const normalizeLogLevel = (level: string | undefined | null) => {
  if (!level) return 'info';
  const lcLevel = level.toLowerCase();
  const validLevels = [
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'trace',
    'verbose',
    'silly',
  ];
  return validLevels.includes(lcLevel) ? lcLevel : 'info';
};

export const logger = (): Promise<ILogger> =>
  new Promise((resolve) => {
    if (!_logger) {
      if (isRunningOnServer()) {
        _logger = pino<'verbose' | 'silly', false>({
          level: normalizeLogLevel(env('LOG_LEVEL_SERVER')),
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
          level: normalizeLogLevel(env('NEXT_PUBLIC_LOG_LEVEL_CLIENT')),
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

const resolvedPromise = Promise.resolve();

export const log = (cb: (l: ILogger) => void) => {
  if (_logger) {
    const cbRet = cb(_logger);
    return cbRet !== undefined ? Promise.resolve(cbRet) : resolvedPromise;
  }
  return logger().then(cb);
};

export const logEvent: LogEventOverloads = async (
  severityOrEvent: EventSeverity | string,
  eventOrMeasurements?: string | Record<string, number | string>,
  measurements?: Record<string, number | string>,
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

  const processed = await emitSendCustomEvent({
    event,
    severity,
  });

  if (processed) {
    return;
  }

  // Pino will intercept this log and send to OTel
  return log((l) => {
    const log = l[severity] || l.info;
    log(event);
  });
};

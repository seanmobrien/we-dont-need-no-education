import pino from 'pino';
import { WrappedLogger } from './wrapped-logger';
import { CustomAppInsightsEvent } from './event';
import { emitSendCustomEvent } from './log-emitter';
const isRunningOnServer = () => {
    return typeof window === 'undefined';
};
const env = (key) => {
    return process.env[key];
};
let _logger;
const normalizeLogLevel = (level) => {
    if (!level)
        return 'info';
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
export const logger = () => new Promise((resolve) => {
    if (!_logger) {
        if (isRunningOnServer()) {
            _logger = pino({
                level: normalizeLogLevel(env('LOG_LEVEL_SERVER')),
                name: 'app',
                timestamp: pino.stdTimeFunctions.isoTime,
                customLevels: { verbose: 5, silly: 1 },
                useOnlyCustomLevels: false,
            });
        }
        else {
            const isJest = process.env.JEST_WORKER_ID !== undefined;
            const transport = isJest
                ? undefined
                : {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                    },
                };
            _logger = pino({
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
export const log = (cb) => {
    if (_logger) {
        const cbRet = cb(_logger);
        return cbRet !== undefined ? Promise.resolve(cbRet) : resolvedPromise;
    }
    return logger().then(cb);
};
export const logEvent = async (severityOrEvent, eventOrMeasurements, measurements) => {
    let severity = 'info';
    let event;
    if (measurements) {
        event = new CustomAppInsightsEvent(eventOrMeasurements, measurements);
        severity = severityOrEvent;
    }
    else if (eventOrMeasurements) {
        if (typeof eventOrMeasurements === 'string') {
            event = new CustomAppInsightsEvent(eventOrMeasurements);
            severity = severityOrEvent;
        }
        else {
            event = new CustomAppInsightsEvent('measurement', eventOrMeasurements);
        }
    }
    else {
        event = new CustomAppInsightsEvent(severityOrEvent);
    }
    const processed = await emitSendCustomEvent({
        event,
        severity,
    });
    if (processed) {
        return;
    }
    return log((l) => {
        const log = l[severity] || l.info;
        log(event);
    });
};

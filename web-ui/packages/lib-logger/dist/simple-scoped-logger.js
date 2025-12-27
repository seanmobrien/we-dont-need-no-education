import { log } from './core';
export const simpleScopedLogger = (sourceOrProps) => {
    const scopedLoggerConfig = typeof sourceOrProps === 'string'
        ? { source: sourceOrProps }
        : { ...sourceOrProps };
    const writeToLog = (action, args) => {
        if (args.length === 0) {
            return;
        }
        const msg = {
            source: scopedLoggerConfig.source,
            timestamp: new Date().toISOString(),
            message: typeof args[0] === 'object' ? (args[0] ?? {}) : String(args[0]),
        };
        if (args.length > 1) {
            msg['data'] = args.slice(1);
        }
        const valueToLog = scopedLoggerConfig.format
            ? scopedLoggerConfig.format(msg)
            : msg;
        if (valueToLog) {
            Array.from(Object.entries(valueToLog)).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    if (Array.isArray(value)) {
                        if (!value.length) {
                            delete valueToLog[key];
                        }
                    }
                    else if (Object.keys(value).length === 0) {
                        delete valueToLog[key];
                    }
                }
            });
        }
        log((l) => action(l, valueToLog));
    };
    return {
        debug: (...args) => writeToLog((l, msg) => l.debug(msg), args),
        info: (...args) => writeToLog((l, msg) => l.info(msg), args),
        warn: (...args) => writeToLog((l, msg) => l.warn(msg), args),
        error: (...args) => writeToLog((l, msg) => l.error(msg), args),
    };
};

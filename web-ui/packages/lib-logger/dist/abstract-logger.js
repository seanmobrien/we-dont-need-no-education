const isError = (value) => {
    return value instanceof Error || (typeof value === 'object' &&
        value !== null &&
        'message' in value &&
        'stack' in value);
};
const isRecord = (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
import { ApplicationInsightsBaseType, ApplicationInsightsCustomEventName, ApplicationInsightsEventBaseType, ApplicationInsightsExceptionBaseType, ATTR_EXCEPTION_MESSAGE, ATTR_EXCEPTION_STACKTRACE, ATTR_EXCEPTION_TYPE, } from './constants';
import { CustomAppInsightsEvent } from './event';
export class AbstractLogger {
    constructor() { }
    logInfoMessage(record) {
        throw new Error('Method not implementedfor ' + JSON.stringify(record));
    }
    logErrorMessage(record) {
        throw new Error('Method not implemented for ' + JSON.stringify(record));
    }
    logWarnMessage(record) {
        throw new Error('Method not implemented for ' + JSON.stringify(record));
    }
    logDebugMessage(record) {
        throw new Error('Method not implemented for ' + JSON.stringify(record));
    }
    logFatalMessage(record) {
        throw new Error('Method not implemented for ' + JSON.stringify(record));
    }
    logVerboseMessage(record) {
        throw new Error('Method not implemented for ' + JSON.stringify(record));
    }
    logSillyMessage(record) {
        throw new Error('Method not implemented for ' + JSON.stringify(record));
    }
    logTraceMessage(record) {
        throw new Error('Method not implemented for ' + JSON.stringify(record));
    }
    buildLogRecord(message, ...args) {
        let record;
        const properties = {};
        const attributes = {};
        let sliceArgOffset = 0;
        if (typeof message === 'string') {
            record = { message };
            if (args.length > 0) {
                if (typeof args[0] === 'object' && args[0] !== null) {
                    const recordBody = {
                        ...(record.body ?? {}),
                        ...('body' in args[0] ? (args[0].body ?? {}) : {}),
                    };
                    record = {
                        ...record,
                        ...args[0],
                        body: recordBody,
                    };
                    if (Object.keys(recordBody).length === 0) {
                        delete record.body;
                    }
                    sliceArgOffset = 1;
                }
            }
            return this.buildLogRecord(record, ...args.slice(sliceArgOffset));
        }
        if ('dispose' in message && typeof message.dispose === 'function') {
            message.dispose();
        }
        let stringValue;
        if (isError(message)) {
            stringValue = !!message.message
                ? typeof message.message === 'object'
                    ? 'body' in message && !!message.body
                        ? String(message.body)
                        : String(message.message)
                    : String(message.message)
                : message.toString();
            record = {
                [ApplicationInsightsBaseType]: ApplicationInsightsExceptionBaseType,
                ...message,
                [ATTR_EXCEPTION_STACKTRACE]: message.stack,
                [ATTR_EXCEPTION_TYPE]: 'source' in message ? (message.source ?? message.name) : message.name,
                [ATTR_EXCEPTION_MESSAGE]: stringValue,
            };
            delete record.stack;
            if ('source' in record) {
                delete record.source;
            }
        }
        else if (CustomAppInsightsEvent.isCustomAppInsightsEvent(message)) {
            stringValue = `AppInsights Event: ${message.event}`;
            record = {
                [ApplicationInsightsCustomEventName]: message.event,
                [ApplicationInsightsBaseType]: ApplicationInsightsEventBaseType,
                ...message,
                body: {
                    measurements: message.measurements ?? {},
                    ...('body' in message ? (message.body ?? {}) : {}),
                },
            };
            delete record.measurements;
            delete record.event;
        }
        else {
            if (!isRecord(message)) {
                throw new Error('Message is not a valid object');
            }
            stringValue = String(message.message ?? message.Message ?? message.body);
            record = {
                msg: stringValue,
                ...message,
            };
        }
        if (args.length > sliceArgOffset) {
            record = {
                ...record,
            };
        }
        Object.keys(record).forEach((key) => {
            if (typeof key !== 'string' ||
                key.startsWith('_') ||
                typeof record[key] === 'function') {
                delete record[key];
            }
        });
        delete record.message;
        delete record.Message;
        if (Object.keys(properties).length) {
            record.properties = {
                ...properties,
                ...(record.properties ?? {}),
            };
        }
        if (Object.keys(attributes).length) {
            record.attributes = {
                ...attributes,
                ...(record.attributes ?? {}),
            };
        }
        record[Symbol.toStringTag] = stringValue ?? 'No message provided';
        return [record];
    }
    info(message, ...args) {
        this.logInfoMessage(...this.buildLogRecord(message, ...args));
    }
    error(message, ...args) {
        const errorMessage = isError(message) ? message : new Error(typeof message === 'string' ? message : JSON.stringify(message));
        const logArguments = this.buildLogRecord(errorMessage, ...args);
        this.logErrorMessage(...logArguments);
    }
    warn(message, ...args) {
        this.logWarnMessage(...this.buildLogRecord(message, ...args));
    }
    debug(message, ...args) {
        this.logDebugMessage(...this.buildLogRecord(message, ...args));
    }
    fatal(message, ...args) {
        this.logFatalMessage(...this.buildLogRecord(message, ...args));
    }
    verbose(message, ...args) {
        this.logVerboseMessage(...this.buildLogRecord(message, ...args));
    }
    silly(message, ...args) {
        this.logSillyMessage(...this.buildLogRecord(message, ...args));
    }
    trace(message, ...args) {
        this.logTraceMessage(...this.buildLogRecord(message, ...args));
    }
}

import { isError, isUnknownRecord, LoggedError } from '../react-util';
import {
  ApplicationInsightsBaseType,
  ApplicationInsightsCustomEventName,
  ApplicationInsightsEventBaseType,
  ApplicationInsightsExceptionBaseType,
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
} from './constants';
import { CustomAppInsightsEvent } from './event';
import type { ILogger } from './types';

export class AbstractLogger implements ILogger {
  /**
   *
   */
  constructor() {}

  protected logInfoMessage(record: object): void {
    throw new Error('Method not implementedfor ' + JSON.stringify(record));
  }
  protected logErrorMessage(record: object): void {
    throw new Error('Method not implemented for ' + JSON.stringify(record));
  }
  protected logWarnMessage(record: object): void {
    throw new Error('Method not implemented for ' + JSON.stringify(record));
  }
  protected logDebugMessage(record: object): void {
    throw new Error('Method not implemented for ' + JSON.stringify(record));
  }
  protected logFatalMessage(record: object): void {
    throw new Error('Method not implemented for ' + JSON.stringify(record));
  }
  protected logVerboseMessage(record: object): void {
    throw new Error('Method not implemented for ' + JSON.stringify(record));
  }
  protected logSillyMessage(record: object): void {
    throw new Error('Method not implemented for ' + JSON.stringify(record));
  }
  protected logTraceMessage(record: object): void {
    throw new Error('Method not implemented for ' + JSON.stringify(record));
  }

  protected buildLogRecord(
    message: string | Record<string, unknown> | Error | object,
    ...args: unknown[]
  ): [object] {
    let record: Record<string, unknown> & { [Symbol.toStringTag]?: string };
    const properties = {} as Record<string, unknown>;
    const attributes = {} as Record<string, unknown>;
    let sliceArgOffset = 0;
    if (typeof message === 'string') {
      record = { message };
      if (args.length > 0) {
        if (typeof args[0] === 'object' && args[0] !== null) {
          record = {
            ...record,
            ...args[0],
            body: {
              ...(record.body ?? {}),
              ...('body' in args[0] ? (args[0].body ?? {}) : {}),
            },
          };
          sliceArgOffset = 1;
        }
      }
      return this.buildLogRecord(record, ...args.slice(sliceArgOffset));
    }
    if ('dispose' in message && typeof message.dispose === 'function') {
      message.dispose();
    }
    // Error / exception messages
    if (isError(message)) {
      const le = LoggedError.isTurtlesAllTheWayDownBaby(message);
      record = {
        [ApplicationInsightsBaseType]: ApplicationInsightsExceptionBaseType,
        ...le,
        [ATTR_EXCEPTION_STACKTRACE]: le.stack,
        [ATTR_EXCEPTION_TYPE]:
          'source' in le ? (le.source ?? le.name) : le.name,
        [ATTR_EXCEPTION_MESSAGE]:
          le.message ?? ('body' in message ? message.body : undefined),
      };
      delete record.stack;
      if ('source' in record) {
        delete record.source;
      }
    } else if (CustomAppInsightsEvent.isCustomAppInsightsEvent(message)) {
      // Custom Event messages
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
    } else {
      if (!isUnknownRecord(message)) {
        throw new Error('Message is not a valid object');
      }
      // and everything else is a generic message
      record = {
        msg: message.message ?? message.Message ?? message.body,
        ...message,
      };
    }
    // Append any unprocessed arguments
    if (args.length > sliceArgOffset) {
      record = {
        ...record,
        // TraceArguments: args,
      };
    }
    Object.keys(record).forEach((key) => {
      if (
        typeof key !== 'string' ||
        key.startsWith('_') ||
        typeof record[key] === 'function'
      ) {
        delete record[key];
      }
    });
    // Cleanup message / Message hanger-ons
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
    record[Symbol.toStringTag] = String(record.body) ?? 'No message provided';
    return [record];
  }

  info(message: string | object, ...args: unknown[]): void {
    this.logInfoMessage(...this.buildLogRecord(message, ...args));
  }
  error(message: string | object, ...args: unknown[]): void {
    const logArguments = this.buildLogRecord(
      LoggedError.isTurtlesAllTheWayDownBaby(message),
      ...args,
    );
    this.logErrorMessage(...logArguments);
  }
  warn(message: string | object, ...args: unknown[]): void {
    this.logWarnMessage(...this.buildLogRecord(message, ...args));
  }
  debug(message: string | object, ...args: unknown[]): void {
    this.logDebugMessage(...this.buildLogRecord(message, ...args));
  }
  fatal(message: string | object, ...args: unknown[]): void {
    this.logFatalMessage(...this.buildLogRecord(message, ...args));
  }
  verbose(message: string | object, ...args: unknown[]): void {
    this.logVerboseMessage(...this.buildLogRecord(message, ...args));
  }
  silly(message: string | object, ...args: unknown[]): void {
    this.logSillyMessage(...this.buildLogRecord(message, ...args));
  }
  trace(message: string | object, ...args: unknown[]): void {
    this.logTraceMessage(...this.buildLogRecord(message, ...args));
  }
}

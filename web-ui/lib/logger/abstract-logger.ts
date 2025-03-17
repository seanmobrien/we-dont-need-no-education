import { ILogger } from './logger';

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
    message: string | object,
    ...args: unknown[]
  ): [object] {
    let record: Record<string, unknown> & { [Symbol.toStringTag]?: string };
    if (typeof message === 'string') {
      record = { body: message };
      if (args.length > 0) {
        let sliceArgOffset = 0;
        if (typeof args[0] === 'object') {
          record = {
            ...record,
            ...args[0],
          };
          sliceArgOffset = 1;
        }
        if (args.length > sliceArgOffset) {
          record = {
            ...record,
            TraceArguments: args.slice(sliceArgOffset),
          };
        }
      }
    } else {
      record = {
        ...(!!message ? message : { Message: 'no message provided.' }),
        TraceArguments: args,
      };
    }
    // Normalize capitalization of the Message property
    const normalizedMessage = String(
      record.body ??
        record.Message ??
        record.message ??
        'View trace record for more information.',
    );
    record.body = normalizedMessage;
    delete record.message;
    delete record.Message;
    record[Symbol.toStringTag] = normalizedMessage;
    return [record];
  }

  info(message: string | object, ...args: unknown[]): void {
    this.logInfoMessage(...this.buildLogRecord(message, ...args));
  }
  error(message: string | object, ...args: unknown[]): void {
    const logArguments = this.buildLogRecord(message, ...args);
    const logRecord: Record<string, string> = logArguments[0];
    logRecord['exception.message'] = logRecord.body;
    logRecord['exception.stacktrace'] = logRecord.stack;
    logRecord['exception.type'] = logRecord.source;
    delete logRecord.stack;
    delete logRecord.source;
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

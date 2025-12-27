import type { ILogger } from './types';
export declare class AbstractLogger implements ILogger {
    constructor();
    protected logInfoMessage(record: object): void;
    protected logErrorMessage(record: object): void;
    protected logWarnMessage(record: object): void;
    protected logDebugMessage(record: object): void;
    protected logFatalMessage(record: object): void;
    protected logVerboseMessage(record: object): void;
    protected logSillyMessage(record: object): void;
    protected logTraceMessage(record: object): void;
    protected buildLogRecord(message: string | Record<string, unknown> | Error | object, ...args: unknown[]): [object];
    info(message: string | object, ...args: unknown[]): void;
    error(message: string | object, ...args: unknown[]): void;
    warn(message: string | object, ...args: unknown[]): void;
    debug(message: string | object, ...args: unknown[]): void;
    fatal(message: string | object, ...args: unknown[]): void;
    verbose(message: string | object, ...args: unknown[]): void;
    silly(message: string | object, ...args: unknown[]): void;
    trace(message: string | object, ...args: unknown[]): void;
}
//# sourceMappingURL=abstract-logger.d.ts.map
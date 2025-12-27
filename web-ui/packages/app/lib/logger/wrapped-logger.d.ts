import { AbstractLogger } from './abstract-logger';
import type { ILogger } from './types';
export declare class WrappedLogger extends AbstractLogger {
    #private;
    /**
     *
     */
    constructor(logger: ILogger);
    protected logInfoMessage(record: object): void;
    protected logErrorMessage(record: object): void;
    protected logWarnMessage(record: object): void;
    protected logDebugMessage(record: object): void;
    protected logFatalMessage(record: object): void;
    protected logVerboseMessage(record: object): void;
    protected logSillyMessage(record: object): void;
    protected logTraceMessage(record: object): void;
}
//# sourceMappingURL=wrapped-logger.d.ts.map
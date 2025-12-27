import type { ILogger, LogEventOverloads } from './types';
export declare const logger: () => Promise<ILogger>;
export declare const log: (cb: (l: ILogger) => void) => Promise<void>;
export declare const logEvent: LogEventOverloads;
//# sourceMappingURL=core.d.ts.map
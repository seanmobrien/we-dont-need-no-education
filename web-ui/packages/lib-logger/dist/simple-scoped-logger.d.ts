import type { SimpleLogger } from './types';
type SimpleScoppedLogRecord = {
    source: string;
    timestamp: string;
    message: string | object;
    data?: unknown[];
};
type SimpleScopedLoggerProps = {
    source: string;
    format?: (msg: SimpleScoppedLogRecord) => object;
};
interface SimpleScopedLoggerOverloads {
    (props: SimpleScopedLoggerProps): SimpleLogger;
    (source: string): SimpleLogger;
}
export declare const simpleScopedLogger: SimpleScopedLoggerOverloads;
export {};
//# sourceMappingURL=simple-scoped-logger.d.ts.map
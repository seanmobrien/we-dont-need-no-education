export interface SimpleLogger {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    debug(...args: unknown[]): void;
}
export interface ILogger extends SimpleLogger {
    info(message: string | object, ...args: unknown[]): void;
    error(message: string | object, ...args: unknown[]): void;
    warn(message: string | object, ...args: unknown[]): void;
    debug(message: string | object, ...args: unknown[]): void;
    fatal(message: string | object, ...args: unknown[]): void;
    verbose(message: string | object, ...args: unknown[]): void;
    silly(message: string | object, ...args: unknown[]): void;
    trace(message: string | object, ...args: unknown[]): void;
}
export type EventSeverity = keyof ILogger;
export interface LogEventOverloads {
    (eventName: string, measurements?: Record<string, number | string>): Promise<void>;
    (severity: EventSeverity, eventName: string, measurements?: Record<string, number | string>): Promise<void>;
}
export type ICustomAppInsightsEvent = {
    event: string;
    measurements?: Record<string, string | number>;
    [Symbol.dispose]?: () => void;
    increment: (name: string, value?: number) => void;
    startTimer: (name: string) => void;
    stopTimer: (name: string) => void;
};
export type SendCustomEventPayload = {
    event: ICustomAppInsightsEvent;
    severity: EventSeverity;
    processed: boolean;
};
export type SendCustomEventListener = (payload: SendCustomEventPayload) => void | Promise<void>;
//# sourceMappingURL=types.d.ts.map
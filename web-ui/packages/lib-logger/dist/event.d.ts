import { ICustomAppInsightsEvent } from './types';
export declare class CustomAppInsightsEvent implements ICustomAppInsightsEvent {
    #private;
    static isCustomAppInsightsEvent(check: unknown): check is ICustomAppInsightsEvent;
    event: string;
    readonly measurements: Record<string, number | string>;
    constructor(event: string, measurements?: Record<string, number | string>);
    increment(name: string, value?: number): void;
    startTimer(name: string): void;
    stopTimer(name: string): void;
    [Symbol.dispose](): void;
}
//# sourceMappingURL=event.d.ts.map
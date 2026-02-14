import { CircuitBreakerConfig } from './types';
export declare enum CircuitBreakerState {
    CLOSED = "closed",
    OPEN = "open",
    PERMANENT_OPEN = "permanent_open"
}
export declare class CircuitBreaker {
    private config;
    private state;
    private triggerCount;
    private switchCount;
    private triggerResetTimer;
    private switchResetTimer;
    private triggerTimeoutTimer;
    private switchTtlStart;
    private switchTtlRemaining;
    constructor(config: CircuitBreakerConfig);
    recordError(): void;
    getState(): CircuitBreakerState;
    reset(): void;
    private startTriggerWindow;
    private startSwitchWindow;
    private pauseSwitchWindow;
    private resumeSwitchWindow;
    private tripTrigger;
    private clearTimers;
}
//# sourceMappingURL=circuit-breaker.d.ts.map
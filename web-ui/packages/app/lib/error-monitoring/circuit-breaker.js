export var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "closed";
    CircuitBreakerState["OPEN"] = "open";
    CircuitBreakerState["PERMANENT_OPEN"] = "permanent_open";
})(CircuitBreakerState || (CircuitBreakerState = {}));
export class CircuitBreaker {
    config;
    state = CircuitBreakerState.CLOSED;
    triggerCount = 0;
    switchCount = 0;
    triggerResetTimer = null;
    switchResetTimer = null;
    triggerTimeoutTimer = null;
    switchTtlStart = 0;
    switchTtlRemaining;
    constructor(config) {
        this.config = config;
        this.switchTtlRemaining = config.switchTtl;
    }
    recordError() {
        if (this.state !== CircuitBreakerState.CLOSED)
            return;
        if (this.triggerCount === 0) {
            this.startTriggerWindow();
        }
        this.triggerCount++;
        if (this.triggerCount > this.config.triggerMax) {
            this.tripTrigger();
        }
    }
    getState() {
        return this.state;
    }
    reset() {
        this.state = CircuitBreakerState.CLOSED;
        this.triggerCount = 0;
        this.switchCount = 0;
        this.switchTtlRemaining = this.config.switchTtl;
        this.clearTimers();
    }
    startTriggerWindow() {
        if (this.triggerResetTimer)
            clearTimeout(this.triggerResetTimer);
        this.triggerResetTimer = setTimeout(() => {
            this.triggerCount = 0;
            this.triggerResetTimer = null;
        }, this.config.triggerTtl);
    }
    startSwitchWindow() {
        if (this.switchResetTimer)
            clearTimeout(this.switchResetTimer);
        this.switchTtlStart = Date.now();
        this.switchResetTimer = setTimeout(() => {
            this.switchCount = 0;
            this.switchResetTimer = null;
            this.switchTtlRemaining = this.config.switchTtl;
        }, this.switchTtlRemaining);
    }
    pauseSwitchWindow() {
        if (this.switchResetTimer) {
            clearTimeout(this.switchResetTimer);
            this.switchResetTimer = null;
            const elapsed = Date.now() - this.switchTtlStart;
            this.switchTtlRemaining = Math.max(0, this.switchTtlRemaining - elapsed);
        }
    }
    resumeSwitchWindow() {
        if (this.switchCount > 0) {
            this.startSwitchWindow();
        }
        else {
            this.switchTtlRemaining = this.config.switchTtl;
        }
    }
    tripTrigger() {
        this.state = CircuitBreakerState.OPEN;
        this.triggerCount = 0;
        if (this.triggerResetTimer)
            clearTimeout(this.triggerResetTimer);
        if (this.switchCount === 0) {
            this.startSwitchWindow();
        }
        this.switchCount++;
        this.pauseSwitchWindow();
        if (this.switchCount >= this.config.switchMax) {
            this.state = CircuitBreakerState.PERMANENT_OPEN;
            return;
        }
        this.triggerTimeoutTimer = setTimeout(() => {
            if (this.state === CircuitBreakerState.OPEN) {
                this.state = CircuitBreakerState.CLOSED;
                this.resumeSwitchWindow();
            }
        }, this.config.triggerTimeout);
    }
    clearTimers() {
        if (this.triggerResetTimer)
            clearTimeout(this.triggerResetTimer);
        if (this.switchResetTimer)
            clearTimeout(this.switchResetTimer);
        if (this.triggerTimeoutTimer)
            clearTimeout(this.triggerTimeoutTimer);
    }
}
//# sourceMappingURL=circuit-breaker.js.map
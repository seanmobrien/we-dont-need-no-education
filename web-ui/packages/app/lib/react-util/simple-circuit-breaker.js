export class SimpleCircuitBreaker {
    errorThreshold;
    resetTimeoutMs;
    failureCount = 0;
    lastFailureTime = 0;
    state = 'CLOSED';
    constructor(errorThreshold = 5, resetTimeoutMs = 30000) {
        this.errorThreshold = errorThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime < this.resetTimeoutMs) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.state = 'HALF_OPEN';
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.errorThreshold) {
            this.state = 'OPEN';
        }
    }
    getState() {
        return this.state;
    }
}
//# sourceMappingURL=simple-circuit-breaker.js.map
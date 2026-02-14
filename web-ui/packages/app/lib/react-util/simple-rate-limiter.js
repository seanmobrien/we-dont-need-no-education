export class SimpleRateLimiter {
    maxAttempts;
    windowMs;
    attempts = new Map();
    constructor(maxAttempts = 5, windowMs = 60000) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
    }
    canAttempt(key) {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];
        const recentAttempts = attempts.filter((time) => now - time < this.windowMs);
        this.attempts.set(key, recentAttempts);
        return recentAttempts.length < this.maxAttempts;
    }
    recordAttempt(key) {
        const attempts = this.attempts.get(key) || [];
        attempts.push(Date.now());
        this.attempts.set(key, attempts);
    }
    reset(key) {
        if (key) {
            this.attempts.delete(key);
        }
        else {
            this.attempts.clear();
        }
    }
}
//# sourceMappingURL=simple-rate-limiter.js.map
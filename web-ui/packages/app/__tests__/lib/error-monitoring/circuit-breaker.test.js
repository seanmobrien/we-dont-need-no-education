import { CircuitBreaker, CircuitBreakerState } from '@/lib/error-monitoring/circuit-breaker';
describe('CircuitBreaker', () => {
    const defaultConfig = {
        triggerMax: 3,
        triggerTtl: 100,
        switchMax: 2,
        switchTtl: 1000,
        triggerTimeout: 200,
    };
    it('starts in CLOSED state', () => {
        const cb = new CircuitBreaker(defaultConfig);
        expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
    });
    it('stays CLOSED if errors are below trigger threshold', () => {
        const cb = new CircuitBreaker(defaultConfig);
        cb.recordError();
        cb.recordError();
        expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
    });
    it('moves to OPEN state when errors exceed triggerMax within triggerTtl', () => {
        const cb = new CircuitBreaker(defaultConfig);
        cb.recordError();
        cb.recordError();
        cb.recordError();
        cb.recordError();
        expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
    });
    it('resets to CLOSED after triggerTimeout expires', async () => {
        const cb = new CircuitBreaker(defaultConfig);
        for (let i = 0; i <= 3; i++)
            cb.recordError();
        expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
        await new Promise((r) => setTimeout(r, 250));
        expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
    });
    it('increments switch counter and handles permanent switch', async () => {
        const cb = new CircuitBreaker({ ...defaultConfig, triggerTimeout: 10 });
        for (let i = 0; i <= 3; i++)
            cb.recordError();
        expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
        await new Promise((r) => setTimeout(r, 20));
        expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
        for (let i = 0; i <= 3; i++)
            cb.recordError();
        expect(cb.getState()).toBe(CircuitBreakerState.PERMANENT_OPEN);
    });
});
//# sourceMappingURL=circuit-breaker.test.js.map
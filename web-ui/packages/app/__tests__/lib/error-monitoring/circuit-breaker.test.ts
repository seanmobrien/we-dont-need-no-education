import { CircuitBreaker, CircuitBreakerState } from '@/lib/error-monitoring/circuit-breaker';

describe('CircuitBreaker', () => {
  const defaultConfig = {
    triggerMax: 3,
    triggerTtl: 100, // 100ms
    switchMax: 2,
    switchTtl: 1000, // 1s
    triggerTimeout: 200, // 200ms
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
    cb.recordError(); // 4th error, max is 3
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('resets to CLOSED after triggerTimeout expires', async () => {
    const cb = new CircuitBreaker(defaultConfig);
    // Trigger it
    for (let i = 0; i <= 3; i++) cb.recordError();
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);

    // Wait for timeout (mocking time would be better but keeping it simple for now as per instructions)
    await new Promise((r) => setTimeout(r, 250));

    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('increments switch counter and handles permanent switch', async () => {
    const cb = new CircuitBreaker({ ...defaultConfig, triggerTimeout: 10 });

    // 1st Trigger
    for (let i = 0; i <= 3; i++) cb.recordError();
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
    await new Promise((r) => setTimeout(r, 20)); // wait for reset
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);

    // 2nd Trigger (switchMax is 2)
    for (let i = 0; i <= 3; i++) cb.recordError();

    // Should be permanently open now
    expect(cb.getState()).toBe(CircuitBreakerState.PERMANENT_OPEN);
  });
});

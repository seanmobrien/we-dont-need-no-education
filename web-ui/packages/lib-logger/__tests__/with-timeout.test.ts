import {
  TimeoutError,
  withTimeout,
  withTimeoutAsError,
} from '@compliance-theater/logger';

describe('withTimeout', () => {
  it('returns value when promise resolves before timeout', async () => {
    const result = await withTimeout(
      Promise.resolve('ok'),
      1000,
      'resolve-fast',
    );
    expect(result.timedOut).not.toBe(true);
    expect(result.value).toBe('ok');
  });

  it('returns timedOut when promise exceeds timeout', async () => {
    jest.useFakeTimers();
    const pending = new Promise<string>(() => undefined);
    const wrapped = withTimeout(pending, 50, 'timeout-test');

    jest.advanceTimersByTime(50);
    const result = await wrapped;

    expect(result.timedOut).toBe(true);
    expect(result.value).toBeUndefined();
    jest.useRealTimers();
  });
});

describe('withTimeoutAsError', () => {
  it('throws TimeoutError when operation times out', async () => {
    jest.useFakeTimers();
    const pending = new Promise<string>(() => undefined);
    const wrapped = withTimeoutAsError(pending, 25, 'error-timeout');

    jest.advanceTimersByTime(25);

    await expect(wrapped).rejects.toBeInstanceOf(TimeoutError);
    await expect(wrapped).rejects.toThrow('error-timeout timed out after 25ms');
    jest.useRealTimers();
  });
});

describe('TimeoutError', () => {
  it('supports type-guard checks', () => {
    expect(TimeoutError.isTimeoutError(new TimeoutError())).toBe(true);
    expect(TimeoutError.isTimeoutError(new Error('nope'))).toBe(false);
  });
});
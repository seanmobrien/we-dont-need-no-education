import { hideConsoleOutput } from '/__tests__/test-utils';
import { debounce } from '/lib/react-util/debounce';

const mockConsole = hideConsoleOutput();

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    mockConsole.dispose();
  });

  it('should call the function after the wait time', async () => {
    const fn = jest.fn(() => 42);
    const debounced = debounce(fn, 100);
    const result = debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    await expect(result).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should only call the function once if called multiple times within wait', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = jest.fn((_x: string) => 'result');
    const debounced = debounce(fn, 200);
    const result1 = debounced('a');
    const result2 = debounced('b');
    jest.advanceTimersByTime(200);
    await expect(result2).resolves.toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
    await expect(result1).rejects.toEqual('Deferred');
  });

  it('should support canceling the debounced call', async () => {
    const fn = jest.fn(() => 1);
    const debounced = debounce(fn, 100);
    const result = debounced();
    debounced.cancel();
    jest.advanceTimersByTime(100);
    await expect(result).rejects.toEqual('Cancelled');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should reject with timeout if not called in time', async () => {
    mockConsole.setup();
    const fn = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve(5), 300)),
    );
    const debounced = debounce(fn, { wait: 100, timeout: 50 });
    const result = debounced();
    jest.advanceTimersByTime(151); // wait + timeout
    await expect(result).rejects.toEqual('Timeout');
  });

  it('should resolve with the function result', async () => {
    const fn = jest.fn((x: number) => x * 2);
    const debounced = debounce(fn, 50);
    const result = debounced(21);
    jest.advanceTimersByTime(50);
    await expect(result).resolves.toBe(42);
  });

  it('should reject if the function throws', async () => {
    mockConsole.setup();
    const fn = jest.fn(() => {
      throw new Error('fail');
    });
    const debounced = debounce(fn, 10);
    const result = debounced();
    jest.advanceTimersByTime(10);
    await expect(result).rejects.toThrow('fail');
  });

  it('should use default timeout if not specified', async () => {
    const fn = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve(5), 1000)),
    );
    const debounced = debounce(fn, { wait: 10 });
    const result = debounced();
    jest.advanceTimersByTime(511); // wait + default timeout (500)
    await expect(result).rejects.toEqual('Timeout');
  });

  it('should not call the function if canceled before wait', async () => {
    const fn = jest.fn(() => 1);
    const debounced = debounce(fn, 100);
    const result = debounced();
    debounced.cancel();
    jest.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
    await expect(result).rejects.toEqual('Cancelled');
  });

  it('should allow multiple independent debounced functions', async () => {
    const fn1 = jest.fn(() => 'a');
    const fn2 = jest.fn(() => 'b');
    const debounced1 = debounce(fn1, 50);
    const debounced2 = debounce(fn2, 50);
    const result1 = debounced1();
    const result2 = debounced2();
    jest.advanceTimersByTime(50);
    await expect(result1).resolves.toBe('a');
    await expect(result2).resolves.toBe('b');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});

import { isConsoleError } from '../../src/errors/next-console-error';
import type { NextConsoleError } from '../../src/errors/next-console-error';

const nextDigestSymbol = Symbol.for('next.console.error.digest');
const nextConsoleErrorType = Symbol.for('next.console.error.type');

function makeConsoleError(overrides: Partial<NextConsoleError> = {}): NextConsoleError {
  const err = new Error('console error') as NextConsoleError;
  err[nextDigestSymbol] = 'NEXT_CONSOLE_ERROR';
  return Object.assign(err, overrides);
}

describe('isConsoleError', () => {
  it('returns true for a valid NextConsoleError with correct digest', () => {
    const err = makeConsoleError();
    expect(isConsoleError(err)).toBe(true);
  });

  it('returns true when error type is set', () => {
    const err = makeConsoleError({ [nextConsoleErrorType]: 'warning' });
    expect(isConsoleError(err)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isConsoleError(null)).toBe(false);
  });

  it('returns false for a primitive string', () => {
    expect(isConsoleError('NEXT_CONSOLE_ERROR')).toBe(false);
  });

  it('returns false for a plain Error without digest', () => {
    expect(isConsoleError(new Error('no digest'))).toBe(false);
  });

  it('returns false when digest symbol is present but has wrong value', () => {
    const obj = { [nextDigestSymbol]: 'WRONG_VALUE' };
    expect(isConsoleError(obj)).toBe(false);
  });

  it('returns false for plain object without digest symbol', () => {
    expect(isConsoleError({ message: 'test' })).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isConsoleError(undefined)).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isConsoleError(42)).toBe(false);
  });

  it('works with environmentName set', () => {
    const err = makeConsoleError({ environmentName: 'browser' });
    expect(isConsoleError(err)).toBe(true);
  });
});

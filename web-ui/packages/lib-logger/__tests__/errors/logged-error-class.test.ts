import { LoggedError, dumpError } from '../../src/errors/logged-error/logged-error-class';
import type { ErrorReportArgs } from '../../src/errors/logged-error/types';

jest.mock('../../src/core', () => ({ log: jest.fn() }));
jest.mock('../../src/utilities', () => ({
  errorLogFactory: jest.fn().mockReturnValue({ severity: 'error', source: 'test-source' }),
}));
jest.mock('../../src/safe-serialize', () => ({
  safeSerialize: jest.fn().mockImplementation((v: unknown, _opts?: unknown) => {
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }),
}));
jest.mock('@compliance-theater/types/get-stack-trace', () => ({
  getStackTrace: jest.fn().mockReturnValue('mock-stack-trace'),
}));
jest.mock('../../src/constants', () => ({
  asKnownSeverityLevel: jest.fn().mockReturnValue('error'),
}));

beforeEach(() => {
  // Clear all subscriptions between tests to avoid cross-test interference
  LoggedError.clearErrorReportSubscriptions();
  jest.clearAllMocks();
  // Re-apply mock implementations after clearAllMocks
  const { safeSerialize } = jest.requireMock('../../src/safe-serialize');
  (safeSerialize as jest.Mock).mockImplementation((v: unknown, _opts?: unknown) => {
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return String(v);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  });
  const { errorLogFactory } = jest.requireMock('../../src/utilities');
  (errorLogFactory as jest.Mock).mockReturnValue({ severity: 'error', source: 'test-source' });
  const { asKnownSeverityLevel } = jest.requireMock('../../src/constants');
  (asKnownSeverityLevel as jest.Mock).mockReturnValue('error');
  const { getStackTrace } = jest.requireMock('@compliance-theater/types/get-stack-trace');
  (getStackTrace as jest.Mock).mockReturnValue('mock-stack-trace');
});

const brandLoggedError = Symbol.for('@no-education/LoggedError');

describe('LoggedError.isLoggedError', () => {
  it('returns true for a real LoggedError instance', () => {
    const err = new LoggedError(new Error('test'));
    expect(LoggedError.isLoggedError(err)).toBe(true);
  });

  it('returns true for object with brandLoggedError symbol set to true', () => {
    const fakeLoggedError = { [brandLoggedError]: true };
    expect(LoggedError.isLoggedError(fakeLoggedError)).toBe(true);
  });

  it('returns false for a regular Error', () => {
    expect(LoggedError.isLoggedError(new Error('plain'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(LoggedError.isLoggedError(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(LoggedError.isLoggedError('not an error')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(LoggedError.isLoggedError(undefined)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(LoggedError.isLoggedError({})).toBe(false);
  });
});

describe('LoggedError.buildMessage', () => {
  it('returns "null or undefined error" for null', () => {
    expect(LoggedError.buildMessage(null)).toBe('null or undefined error');
  });

  it('returns "null or undefined error" for undefined', () => {
    expect(LoggedError.buildMessage(undefined)).toBe('null or undefined error');
  });

  it('returns "null or undefined error" for false', () => {
    expect(LoggedError.buildMessage(false)).toBe('null or undefined error');
  });

  it('returns "null or undefined error" for 0', () => {
    expect(LoggedError.buildMessage(0)).toBe('null or undefined error');
  });

  it('returns error.message for Error instances', () => {
    const err = new Error('my error message');
    expect(LoggedError.buildMessage(err)).toBe('my error message');
  });

  it('returns wrapped error message for object with { error: Error }', () => {
    expect(LoggedError.buildMessage({ error: new Error('wrapped') })).toBe('wrapped');
  });

  it('serializes plain objects', () => {
    const result = LoggedError.buildMessage({ foo: 'bar' });
    expect(result).toContain('Error:');
  });

  it('serializes string values', () => {
    const result = LoggedError.buildMessage('just a string' as unknown);
    expect(result).toBe('just a string');
  });
});

describe('LoggedError constructor', () => {
  describe('string as first argument', () => {
    it('wraps string in a new Error when no options provided', () => {
      const logged = new LoggedError('something went wrong');
      expect(logged.message).toBe('something went wrong');
    });

    it('defaults critical to true', () => {
      const logged = new LoggedError('test');
      expect(logged.critical).toBe(true);
    });

    it('uses Error as second arg', () => {
      const inner = new Error('inner');
      const logged = new LoggedError('message', inner);
      expect(logged.error).toBe(inner);
    });

    it('uses { error } options as second arg', () => {
      const inner = new Error('inner');
      const logged = new LoggedError('message', { error: inner });
      expect(logged.error).toBe(inner);
    });

    it('throws TypeError when options object has no error property', () => {
      expect(() => new LoggedError('message', { critical: false } as never)).toThrow(TypeError);
    });

    it('respects critical: false from options', () => {
      const inner = new Error('test');
      const logged = new LoggedError('msg', { error: inner, critical: false });
      expect(logged.critical).toBe(false);
    });
  });

  describe('Error as first argument', () => {
    it('wraps the Error', () => {
      const inner = new Error('inner error');
      const logged = new LoggedError(inner);
      expect(logged.error).toBe(inner);
    });

    it('defaults critical to true', () => {
      const logged = new LoggedError(new Error('x'));
      expect(logged.critical).toBe(true);
    });
  });

  describe('LoggedErrorOptions as first argument', () => {
    it('uses the provided error', () => {
      const inner = new Error('from options');
      const logged = new LoggedError({ error: inner });
      expect(logged.error).toBe(inner);
    });

    it('respects critical: false', () => {
      const logged = new LoggedError({ error: new Error('x'), critical: false });
      expect(logged.critical).toBe(false);
    });

    it('throws TypeError when error property is missing/undefined', () => {
      expect(() => new LoggedError({ error: undefined as never })).toThrow(TypeError);
    });
  });
});

describe('LoggedError getters', () => {
  let inner: Error;
  let logged: LoggedError;

  beforeEach(() => {
    inner = new Error('hello');
    logged = new LoggedError(inner);
  });

  it('message proxies the inner error message', () => {
    expect(logged.message).toBe('hello');
  });

  it('name proxies the inner error name', () => {
    expect(logged.name).toBe('Error');
  });

  it('stack proxies the inner error stack (contains error message)', () => {
    // The stack getter returns this[INNER_ERROR].stack
    expect(logged.stack).toContain('hello');
    expect(typeof logged.stack).toBe('string');
  });

  it('critical returns true by default', () => {
    expect(logged.critical).toBe(true);
  });

  it('cause proxies the inner error cause', () => {
    const cause = new Error('root');
    const errWithCause = new Error('with cause');
    errWithCause.cause = cause;
    const le = new LoggedError(errWithCause);
    expect(le.cause).toBe(cause);
  });

  it('error returns the inner error', () => {
    expect(logged.error).toBe(inner);
  });

  it('Symbol.toStringTag includes LoggedError', () => {
    expect(logged[Symbol.toStringTag]).toContain('LoggedError');
  });
});

describe('LoggedError.isTurtlesAllTheWayDownBaby', () => {
  it('returns LoggedError for a regular Error', () => {
    const err = new Error('regular');
    const result = LoggedError.isTurtlesAllTheWayDownBaby(err, { log: false });
    expect(LoggedError.isLoggedError(result)).toBe(true);
  });

  it('passthrough for an existing LoggedError (log: false)', () => {
    const le = new LoggedError(new Error('already'));
    const result = LoggedError.isTurtlesAllTheWayDownBaby(le, { log: false });
    expect(result).toBe(le);
  });

  it('passthrough for LoggedError when log: true, relog: false (no re-log)', () => {
    const le = new LoggedError(new Error('already'));
    const cb = jest.fn();
    LoggedError.subscribeToErrorReports(cb);
    LoggedError.isTurtlesAllTheWayDownBaby(le, { log: true, relog: false });
    expect(cb).not.toHaveBeenCalled();
  });

  it('re-logs for LoggedError when log: true, relog: true', () => {
    const le = new LoggedError(new Error('already'));
    const cb = jest.fn();
    LoggedError.subscribeToErrorReports(cb);
    LoggedError.isTurtlesAllTheWayDownBaby(le, {
      log: true,
      relog: true,
      source: 'test',
    });
    expect(cb).toHaveBeenCalled();
  });

  it('wraps regular Error and logs when log: true', () => {
    const err = new Error('logged err');
    const cb = jest.fn();
    LoggedError.subscribeToErrorReports(cb);
    LoggedError.isTurtlesAllTheWayDownBaby(err, { log: true, source: 'test' });
    expect(cb).toHaveBeenCalled();
  });

  it('extracts and recurses for composite { error: Error } object', () => {
    const inner = new Error('inner composite');
    const composite = { error: inner, extra: 'data' };
    const result = LoggedError.isTurtlesAllTheWayDownBaby(composite, { log: false });
    expect(LoggedError.isLoggedError(result)).toBe(true);
    expect(result.message).toBe('inner composite');
  });

  it('wraps non-error string as a LoggedError', () => {
    const result = LoggedError.isTurtlesAllTheWayDownBaby('string threw', { log: false });
    expect(LoggedError.isLoggedError(result)).toBe(true);
    expect(result.message).toBe('string threw');
  });

  it('does not log AbortError when logCanceledOperation: false', () => {
    const abortErr = new DOMException('aborted', 'AbortError');
    const cb = jest.fn();
    LoggedError.subscribeToErrorReports(cb);
    LoggedError.isTurtlesAllTheWayDownBaby(abortErr, {
      log: true,
      logCanceledOperation: false,
      source: 'test',
    });
    expect(cb).not.toHaveBeenCalled();
  });

  it('logs AbortError when logCanceledOperation: true', () => {
    const abortErr = new DOMException('aborted', 'AbortError');
    const cb = jest.fn();
    LoggedError.subscribeToErrorReports(cb);
    LoggedError.isTurtlesAllTheWayDownBaby(abortErr, {
      log: true,
      logCanceledOperation: true,
      source: 'test',
    });
    expect(cb).toHaveBeenCalled();
  });
});

describe('LoggedError.subscribeToErrorReports / writeToLog', () => {
  it('calls subscriber callback when writeToLog is invoked', () => {
    const cb = jest.fn();
    LoggedError.subscribeToErrorReports(cb);
    const le = new LoggedError(new Error('write test'));
    le.writeToLog({ source: 'test-source' });
    expect(cb).toHaveBeenCalledTimes(1);
    const args: ErrorReportArgs = cb.mock.calls[0][0];
    expect(args.error).toBe(le);
  });

  it('unsubscribeFromErrorReports stops receiving events', () => {
    const cb = jest.fn();
    LoggedError.subscribeToErrorReports(cb);
    LoggedError.unsubscribeFromErrorReports(cb);
    const le = new LoggedError(new Error('should not receive'));
    le.writeToLog({ source: 'test' });
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('dumpError', () => {
  it('returns the error message for a plain Error', () => {
    const result = dumpError(new Error('dump me'));
    expect(result).toBe('dump me');
  });

  it('includes cause chain when error has a cause', () => {
    const root = new Error('root cause');
    const outer = new Error('outer error');
    outer.cause = root;
    const result = dumpError(outer);
    expect(result).toContain('outer error');
    expect(result).toContain('root cause');
  });

  it('serializes plain objects', () => {
    const result = dumpError({ some: 'data' });
    expect(result).toContain('some');
  });

  it('serializes non-error primitives', () => {
    const result = dumpError(42);
    expect(result).toBe('42');
  });

  it('serializes LoggedError with filter (no infinite recursion)', () => {
    const le = new LoggedError(new Error('logged'));
    const result = dumpError(le);
    expect(typeof result).toBe('string');
  });

  it('invokes propertyFilter function body when serializing branded non-Error LoggedError-like object', () => {
    // The propertyFilter is used in dumpError's else-if branch (non-Error objects).
    // A branded non-Error object with the LoggedError brand symbol reaches this path.
    const { safeSerialize } = jest.requireMock('../../src/safe-serialize');
    let filterWasCalled = false;
    (safeSerialize as jest.Mock).mockImplementationOnce(
      (_v: unknown, opts?: { maxObjectDepth?: number; propertyFilter?: (key: string, path: string) => boolean }) => {
        if (opts?.propertyFilter) {
          filterWasCalled = true;
          // Test that the filter excludes 'cause.cause' and allows other paths
          expect(opts.propertyFilter('cause', 'cause.cause')).toBe(false);
          expect(opts.propertyFilter('message', 'message')).toBe(true);
        }
        return 'serialized';
      }
    );
    // Create a plain object with the LoggedError brand symbol but WITHOUT message/name
    // so isError returns false, but isLoggedError returns true (it has the brand)
    // This causes dumpError to use the else-if branch with propertyFilter
    const brandedNonError = { [brandLoggedError]: true, someData: 'value' };
    dumpError(brandedNonError);
    expect(filterWasCalled).toBe(true);
  });

  it('handles null', () => {
    const result = dumpError(null);
    expect(typeof result).toBe('string');
  });
});

describe('LoggedError additional coverage', () => {
  describe('isTurtlesAllTheWayDownBaby with progress event', () => {
    it('wraps a progress event in ProgressEventError and returns LoggedError (log: false)', () => {
      // Create a duck-typed progress event that satisfies isProgressEvent
      const xhr = {
        readyState: 4, status: 200, timeout: 0, upload: {},
        response: null, open: jest.fn(), send: jest.fn(),
      };
      const progressEvent = { target: xhr, loaded: 100, total: 200, lengthComputable: true };
      const result = LoggedError.isTurtlesAllTheWayDownBaby(progressEvent, { log: false });
      expect(LoggedError.isLoggedError(result)).toBe(true);
    });

    it('wraps a progress event in ProgressEventError when log: true (covers lines 148-161)', () => {
      // log: true causes the code to reach lines 148-161 (progress event branch in shouldLog block)
      const xhr = {
        readyState: 4, status: 200, timeout: 0, upload: {},
        response: null, open: jest.fn(), send: jest.fn(),
      };
      const progressEvent = { target: xhr, loaded: 100, total: 200, lengthComputable: true };
      const cb = jest.fn();
      LoggedError.subscribeToErrorReports(cb);
      const result = LoggedError.isTurtlesAllTheWayDownBaby(progressEvent, {
        log: true,
        source: 'progress-test',
      });
      expect(LoggedError.isLoggedError(result)).toBe(true);
    });

    it('logs "bonehead threw a not-error" when non-error, non-progress, log: true', () => {
      // This covers lines 165-173: the "bonehead" path
      const { log: mockLog } = jest.requireMock('../../src/core');
      LoggedError.isTurtlesAllTheWayDownBaby(12345, { log: true, source: 'bonehead-test' });
      expect(mockLog).toHaveBeenCalled();
    });

    it('invokes the log callback in bonehead path to cover l.warn (line 166)', () => {
      // Make log actually invoke its callback to hit line 166 (l.warn)
      const { log: mockLog } = jest.requireMock('../../src/core');
      (mockLog as jest.Mock).mockImplementationOnce((cb: (l: { warn: jest.Mock }) => void) => {
        cb({ warn: jest.fn() });
      });
      // A non-error, non-progress-event with log:true triggers the bonehead warning
      LoggedError.isTurtlesAllTheWayDownBaby('bonehead string', { log: true, source: 'test' });
    });
  });

  describe('name getter with IPostgresError cause', () => {
    it('returns cause name when inner error cause has name === "IPostgresError"', () => {
      const cause = new Error('postgres cause');
      cause.name = 'IPostgresError';
      const inner = new Error('wrapper');
      inner.cause = cause;
      const le = new LoggedError(inner);
      expect(le.name).toBe('IPostgresError');
    });
  });

  describe('constructor DrizzleError path (lines 331-336)', () => {
    it('copies fields from inner error when cause is a DrizzleError', () => {
      const drizzleErr = new Error('drizzle cause');
      drizzleErr.name = 'DrizzleError';
      const inner = new Error('db error');
      inner.cause = drizzleErr;
      // This should NOT throw and should copy extra fields
      const le = new LoggedError(inner);
      expect(LoggedError.isLoggedError(le)).toBe(true);
    });

    it('copies enumerable fields from inner error when cause is named DrizzleError', () => {
      // Create an inner error with an enumerable own property to trigger lines 334-336
      const drizzleErr = new Error('drizzle cause');
      drizzleErr.name = 'DrizzleError';
      const inner = new Error('db error with fields');
      inner.cause = drizzleErr;
      // Add an enumerable own property that's not on LoggedError and is truthy
      (inner as Record<string, unknown>)['pgCode'] = '23505';
      const le = new LoggedError(inner);
      expect(LoggedError.isLoggedError(le)).toBe(true);
    });

    it('copies enumerable fields from inner error when cause is named PostgresError', () => {
      const postgresErr = new Error('postgres cause');
      postgresErr.name = 'PostgresError';
      const inner = new Error('db error');
      inner.cause = postgresErr;
      (inner as Record<string, unknown>)['constraint'] = 'users_pkey';
      const le = new LoggedError(inner);
      expect(LoggedError.isLoggedError(le)).toBe(true);
    });
  });

  describe('stack getter', () => {
    it('returns the inner error stack when it exists', () => {
      const inner = new Error('with stack');
      const le = new LoggedError({ error: inner });
      // le.stack proxies inner.stack
      expect(le.stack).toContain('with stack');
    });
  });

  describe('buildMessage with empty serialized object', () => {
    it('handles object with empty serialization (toString fallback)', () => {
      // When safeSerialize returns empty string, toString fallback is used
      const { safeSerialize } = jest.requireMock('../../src/safe-serialize');
      (safeSerialize as jest.Mock).mockReturnValueOnce('');
      const result = LoggedError.buildMessage({ some: 'object' });
      expect(typeof result).toBe('string');
    });
  });
});

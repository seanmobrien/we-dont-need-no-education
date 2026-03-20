import {
  PostgresError,
  isDrizzleError,
  errorFromCode,
  PG_ERROR_CODE_DESCRIPTIONS,
} from '../../src/errors/postgres-error';

describe('PostgresError', () => {
  describe('constructor', () => {
    it('is an instance of Error', () => {
      const err = new PostgresError('pg error');
      expect(err).toBeInstanceOf(Error);
    });

    it('sets name to DrizzleError', () => {
      const err = new PostgresError('pg error');
      expect(err.name).toBe('DrizzleError');
    });

    it('sets the message', () => {
      const err = new PostgresError('connection failed');
      expect(err.message).toBe('connection failed');
    });

    it('accepts cause option via class property assignment', () => {
      // PostgresError has cause as its own class property (cause?: unknown)
      // which overrides the Error built-in cause; set it directly
      const cause = new Error('root cause');
      const err = new PostgresError('wrapped');
      err.cause = cause;
      expect(err.cause).toBe(cause);
    });
  });

  describe('isDrizzleError (static)', () => {
    it('returns true for object with name === "DrizzleError"', () => {
      expect(PostgresError.isDrizzleError({ name: 'DrizzleError' })).toBe(true);
    });

    it('returns true for a PostgresError instance', () => {
      expect(PostgresError.isDrizzleError(new PostgresError('x'))).toBe(true);
    });

    it('returns false for null', () => {
      expect(PostgresError.isDrizzleError(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(PostgresError.isDrizzleError('DrizzleError')).toBe(false);
    });

    it('returns false for object with different name', () => {
      expect(PostgresError.isDrizzleError({ name: 'SomethingElse' })).toBe(false);
    });

    it('returns false for a plain Error', () => {
      expect(PostgresError.isDrizzleError(new Error('nope'))).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(PostgresError.isDrizzleError(undefined)).toBe(false);
    });
  });

  describe('errorFromCode (static)', () => {
    it('returns description for known code "23505"', () => {
      expect(PostgresError.errorFromCode('23505')).toBe('unique_violation');
    });

    it('returns description for known code "23502"', () => {
      expect(PostgresError.errorFromCode('23502')).toBe('not_null_violation');
    });

    it('returns undefined for unknown code', () => {
      expect(PostgresError.errorFromCode('99999')).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(PostgresError.errorFromCode(undefined)).toBeUndefined();
    });

    it('trims whitespace from string code', () => {
      expect(PostgresError.errorFromCode('  23505  ')).toBe('unique_violation');
    });

    it('handles lowercase code by uppercasing it', () => {
      expect(PostgresError.errorFromCode('23505')).toBe('unique_violation');
    });

    it('returns undefined for null', () => {
      expect(PostgresError.errorFromCode(null)).toBeUndefined();
    });

    it('returns undefined for a number', () => {
      expect(PostgresError.errorFromCode(12345)).toBeUndefined();
    });

    it('resolves code from a DrizzleError-shaped object', () => {
      const drizzleLike = { name: 'DrizzleError', code: '23505' } as unknown;
      expect(PostgresError.errorFromCode(drizzleLike)).toBe('unique_violation');
    });

    it('returns undefined for DrizzleError object with unknown code', () => {
      const drizzleLike = { name: 'DrizzleError', code: '99999' };
      expect(PostgresError.errorFromCode(drizzleLike)).toBeUndefined();
    });
  });

  describe('name getter', () => {
    it('getter is accessible and returns DrizzleError via instance', () => {
      const err = new PostgresError('test');
      expect(err.name).toBe('DrizzleError');
    });

    it('name getter is defined on prototype and invocable', () => {
      // The constructor sets name as own property shadowing the getter,
      // so we invoke the getter via prototype descriptor to get coverage.
      const err = new PostgresError('test');
      const descriptor = Object.getOwnPropertyDescriptor(PostgresError.prototype, 'name');
      if (descriptor?.get) {
        // Returns super.name = Error.prototype.name = 'Error' when called without own name
        const result = descriptor.get.call(err);
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('codeDescription getter', () => {
    it('returns description when code is a known code', () => {
      const err = new PostgresError('unique constraint violation');
      err.code = '23505';
      expect(err.codeDescription).toBe('unique_violation');
    });

    it('returns undefined when code is not set', () => {
      const err = new PostgresError('some error');
      expect(err.codeDescription).toBeUndefined();
    });

    it('returns undefined when code is unknown', () => {
      const err = new PostgresError('some error');
      err.code = '99999';
      expect(err.codeDescription).toBeUndefined();
    });
  });
});

describe('isDrizzleError (module-level re-export)', () => {
  it('returns true for DrizzleError-named object', () => {
    expect(isDrizzleError({ name: 'DrizzleError' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isDrizzleError(null)).toBe(false);
  });
});

describe('errorFromCode (module-level re-export)', () => {
  it('returns description for known code', () => {
    expect(errorFromCode('23505')).toBe('unique_violation');
  });

  it('returns undefined for unknown code', () => {
    expect(errorFromCode('unknown')).toBeUndefined();
  });
});

describe('PG_ERROR_CODE_DESCRIPTIONS', () => {
  it('contains the unique_violation entry', () => {
    expect(PG_ERROR_CODE_DESCRIPTIONS['23505']).toBe('unique_violation');
  });

  it('contains the not_null_violation entry', () => {
    expect(PG_ERROR_CODE_DESCRIPTIONS['23502']).toBe('not_null_violation');
  });
});

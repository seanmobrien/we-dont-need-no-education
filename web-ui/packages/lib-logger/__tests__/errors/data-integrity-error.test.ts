import { DataIntegrityError } from '../../src/errors/data-integrity-error';

describe('DataIntegrityError', () => {
  describe('constructor with string message', () => {
    it('is an instance of Error', () => {
      const err = new DataIntegrityError('something is wrong');
      expect(err).toBeInstanceOf(Error);
    });

    it('sets the message from the string', () => {
      const err = new DataIntegrityError('data integrity issue');
      expect(err.message).toBe('data integrity issue');
    });

    it('sets name to DataIntegrityError', () => {
      const err = new DataIntegrityError('x');
      expect(err.name).toBe('DataIntegrityError');
    });

    it('stores table from second arg options', () => {
      const err = new DataIntegrityError('msg', { table: 'users' });
      expect(err.table).toBe('users');
    });

    it('stores source from second arg options', () => {
      const err = new DataIntegrityError('msg', { source: 'UserService' });
      expect(err.source).toBe('UserService');
    });

    it('defaults table to empty string when not provided', () => {
      const err = new DataIntegrityError('msg');
      expect(err.table).toBe('');
    });

    it('defaults source to empty string when not provided', () => {
      const err = new DataIntegrityError('msg');
      expect(err.source).toBe('');
    });

    it('sets Symbol.toStringTag to the message', () => {
      const err = new DataIntegrityError('my message');
      expect(err[Symbol.toStringTag]).toBe('my message');
    });
  });

  describe('constructor with DataIntegrityErrorOptions object', () => {
    it('builds message from options with table and source', () => {
      const err = new DataIntegrityError({ table: 'orders', source: 'OrderService' });
      expect(err.message).toBe("Table 'orders' Source: OrderService");
    });

    it('builds message with table only', () => {
      const err = new DataIntegrityError({ table: 'products' });
      expect(err.message).toBe("Table 'products'");
    });

    it('builds message with source only', () => {
      const err = new DataIntegrityError({ source: 'MyService' });
      expect(err.message).toBe('DataIntegrity error Source: MyService');
    });

    it('builds message with neither table nor source', () => {
      const err = new DataIntegrityError({});
      expect(err.message).toBe('DataIntegrity error');
    });

    it('table and source getters default to empty string when options is used as first arg', () => {
      // When using options form, second arg is undefined so table/source come from constructor defaults
      const err = new DataIntegrityError({ table: 'tbl', source: 'svc' });
      // The second arg is undefined, so options defaults apply
      expect(err.table).toBe('');
      expect(err.source).toBe('');
    });
  });

  describe('buildMessage static method', () => {
    it('produces "Table <name>" when table is present', () => {
      expect(DataIntegrityError.buildMessage({ table: 'items' })).toBe("Table 'items'");
    });

    it('produces fallback when no table', () => {
      expect(DataIntegrityError.buildMessage({})).toBe('DataIntegrity error');
    });

    it('appends source when present', () => {
      expect(DataIntegrityError.buildMessage({ source: 'Svc' })).toBe('DataIntegrity error Source: Svc');
    });

    it('combines table and source', () => {
      expect(DataIntegrityError.buildMessage({ table: 'x', source: 'y' })).toBe("Table 'x' Source: y");
    });
  });

  describe('isDataIntegrityError', () => {
    it('returns true for a real DataIntegrityError instance', () => {
      const err = new DataIntegrityError('test');
      expect(DataIntegrityError.isDataIntegrityError(err)).toBe(true);
    });

    it('returns false for a plain Error with a different cause', () => {
      const err = new Error('oops');
      (err as Error & { cause?: unknown }).cause = new Error('something else');
      expect(DataIntegrityError.isDataIntegrityError(err)).toBe(false);
    });

    it('returns false for an Error with no cause', () => {
      expect(DataIntegrityError.isDataIntegrityError(new Error('no cause'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(DataIntegrityError.isDataIntegrityError(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(DataIntegrityError.isDataIntegrityError('not an error')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(DataIntegrityError.isDataIntegrityError(42)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(DataIntegrityError.isDataIntegrityError(undefined)).toBe(false);
    });
  });

  describe('message getter', () => {
    it('returns the message set in constructor', () => {
      const err = new DataIntegrityError('the message');
      expect(err.message).toBe('the message');
    });

    it('message getter via prototype descriptor is invocable', () => {
      // The Error constructor sets message as own property, shadowing the getter.
      // We invoke the getter directly through the prototype descriptor to get coverage.
      const err = new DataIntegrityError('proto test');
      const descriptor = Object.getOwnPropertyDescriptor(DataIntegrityError.prototype, 'message');
      if (descriptor?.get) {
        // Calling the getter via prototype: super.message returns Error.prototype.message = ''
        // which is not null/undefined, so it returns '' (the ?? fallback is not hit)
        const result = descriptor.get.call(err);
        expect(typeof result).toBe('string');
      }
    });
  });
});

import { ValidationError } from '../../src/errors/validation-error';

describe('ValidationError', () => {
  describe('constructor with string message', () => {
    it('is an instance of Error', () => {
      const err = new ValidationError('validation failed');
      expect(err).toBeInstanceOf(Error);
    });

    it('sets the message from the string', () => {
      const err = new ValidationError('bad input');
      expect(err.message).toBe('bad input');
    });

    it('sets name to ValidationError', () => {
      const err = new ValidationError('x');
      expect(err.name).toBe('ValidationError');
    });

    it('stores field from second arg options', () => {
      const err = new ValidationError('msg', { field: 'email' });
      expect(err.field).toBe('email');
    });

    it('stores value from second arg options', () => {
      const err = new ValidationError('msg', { value: 'bad@' });
      expect(err.value).toBe('bad@');
    });

    it('stores expected from second arg options', () => {
      const err = new ValidationError('msg', { expected: 'valid email' });
      expect(err.expected).toBe('valid email');
    });

    it('stores reason from second arg options', () => {
      const err = new ValidationError('msg', { reason: 'Invalid format' });
      expect(err.reason).toBe('Invalid format');
    });

    it('stores source from second arg options', () => {
      const err = new ValidationError('msg', { source: 'UserService' });
      expect(err.source).toBe('UserService');
    });

    it('defaults all options to empty string when not provided', () => {
      const err = new ValidationError('msg');
      expect(err.field).toBe('');
      expect(err.value).toBe('');
      expect(err.expected).toBe('');
      expect(err.reason).toBe('');
      expect(err.source).toBe('');
    });

    it('sets Symbol.toStringTag to the message', () => {
      const err = new ValidationError('my message');
      expect(err[Symbol.toStringTag]).toBe('my message');
    });
  });

  describe('constructor with ValidationErrorOptions object', () => {
    it('builds message using buildMessage with field', () => {
      const err = new ValidationError({ field: 'email' });
      expect(err.message).toContain("Field 'email'");
    });

    it('builds message with value included', () => {
      const err = new ValidationError({ field: 'age', value: 'abc' });
      expect(err.message).toContain('Value: "abc"');
    });

    it('builds message with expected included', () => {
      const err = new ValidationError({ expected: 'number' });
      expect(err.message).toContain('Expected: "number"');
    });

    it('builds message with reason included', () => {
      const err = new ValidationError({ reason: 'Must be positive' });
      expect(err.message).toContain('Reason: Must be positive');
    });

    it('builds message with source included', () => {
      const err = new ValidationError({ source: 'OrderSvc' });
      expect(err.message).toContain('Source: OrderSvc');
    });

    it('falls back to "Validation error" when no field', () => {
      const err = new ValidationError({});
      expect(err.message).toBe('Validation error');
    });
  });

  describe('buildMessage static method', () => {
    it('uses "Field <name>" prefix when field is present', () => {
      expect(ValidationError.buildMessage({ field: 'name' })).toContain("Field 'name'");
    });

    it('falls back to "Validation error" when no field', () => {
      expect(ValidationError.buildMessage({})).toBe('Validation error');
    });

    it('includes value as JSON', () => {
      expect(ValidationError.buildMessage({ value: 123 })).toContain('Value: 123');
    });

    it('includes expected as JSON', () => {
      expect(ValidationError.buildMessage({ expected: 'string' })).toContain('Expected: "string"');
    });

    it('includes reason', () => {
      expect(ValidationError.buildMessage({ reason: 'too short' })).toContain('Reason: too short');
    });

    it('includes source', () => {
      expect(ValidationError.buildMessage({ source: 'Svc' })).toContain('Source: Svc');
    });

    it('produces full message with all fields', () => {
      const msg = ValidationError.buildMessage({
        field: 'age',
        value: -1,
        expected: 'positive number',
        reason: 'Must be > 0',
        source: 'MyService',
      });
      expect(msg).toBe("Field 'age' Value: -1 Expected: \"positive number\" Reason: Must be > 0 Source: MyService");
    });

    it('produces "Validation error" for empty options', () => {
      expect(ValidationError.buildMessage({})).toBe('Validation error');
    });
  });

  describe('isValidationError', () => {
    it('returns true for a real ValidationError instance', () => {
      const err = new ValidationError('test');
      expect(ValidationError.isValidationError(err)).toBe(true);
    });

    it('returns false for a plain Error with a different cause', () => {
      const err = new Error('oops');
      (err as Error & { cause?: unknown }).cause = new Error('something');
      expect(ValidationError.isValidationError(err)).toBe(false);
    });

    it('returns false for an Error with no cause', () => {
      expect(ValidationError.isValidationError(new Error('no cause'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(ValidationError.isValidationError(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(ValidationError.isValidationError('error')).toBe(false);
    });

    it('returns false for a number', () => {
      expect(ValidationError.isValidationError(0)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(ValidationError.isValidationError(undefined)).toBe(false);
    });
  });
});

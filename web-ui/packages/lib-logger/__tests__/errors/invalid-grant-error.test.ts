import { InvalidGrantError } from '../../src/errors/invalid-grant-error';

describe('InvalidGrantError', () => {
  describe('constructor with Error as first argument', () => {
    it('extends Error', () => {
      const cause = new Error('original error');
      const err = new InvalidGrantError(cause);
      expect(err).toBeInstanceOf(Error);
    });

    it('uses the original error message', () => {
      const cause = new Error('original message');
      const err = new InvalidGrantError(cause);
      expect(err.message).toBe('original message');
    });

    it('sets the original error as cause', () => {
      const cause = new Error('original');
      const err = new InvalidGrantError(cause);
      expect(err.cause).toBe(cause);
    });

    it('sets name to InvalidGrantError', () => {
      const err = new InvalidGrantError(new Error('x'));
      expect(err.name).toBe('InvalidGrantError');
    });

    it('handles unknown non-Error objects (duck typing fallback)', () => {
      // When the first arg is an object with .message (not a string)
      const fakeError = { message: 'fake error message' } as unknown as Error;
      const err = new InvalidGrantError(fakeError);
      expect(err.message).toBe('fake error message');
    });
  });

  describe('constructor with string as first argument', () => {
    it('uses the string as message', () => {
      const err = new InvalidGrantError('invalid_grant', {});
      expect(err.message).toBe('invalid_grant');
    });

    it('sets name to InvalidGrantError', () => {
      const err = new InvalidGrantError('invalid_grant', {});
      expect(err.name).toBe('InvalidGrantError');
    });

    it('accepts cause option (cause is ignored in the string branch implementation)', () => {
      // In the string branch, super(error) is called without options so cause is not passed through
      const cause = new Error('root cause');
      const err = new InvalidGrantError('invalid_grant', { cause });
      // The string overload only calls super(error) without spreading options, so cause is not set
      expect(err.message).toBe('invalid_grant');
    });

    it('works without options', () => {
      const err = new InvalidGrantError('no options' as string, undefined as unknown as { cause?: unknown });
      expect(err.message).toBe('no options');
    });
  });
});

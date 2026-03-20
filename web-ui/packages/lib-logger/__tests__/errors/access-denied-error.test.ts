import { AccessDeniedError } from '../../src/errors/access-denied-error';

jest.mock('@compliance-theater/types/get-stack-trace', () => ({
  getStackTrace: jest.fn(() => 'mock-stack-trace'),
}));

describe('AccessDeniedError', () => {
  it('uses default message when none provided', () => {
    const error = new AccessDeniedError();
    expect(error.message).toBe('Access denied');
  });

  it('sets name to AccessDeniedError', () => {
    const error = new AccessDeniedError();
    expect(error.name).toBe('AccessDeniedError');
  });

  it('sets stack via getStackTrace helper', () => {
    const error = new AccessDeniedError();
    expect(error.stack).toBe('mock-stack-trace');
  });

  it('uses custom message when provided', () => {
    const error = new AccessDeniedError('you shall not pass');
    expect(error.message).toBe('you shall not pass');
  });

  it('is an instance of Error', () => {
    expect(new AccessDeniedError()).toBeInstanceOf(Error);
  });

  describe('isAccessDeniedError', () => {
    it('returns true for AccessDeniedError instances', () => {
      expect(AccessDeniedError.isAccessDeniedError(new AccessDeniedError())).toBe(true);
    });

    it('returns false for plain Error instances', () => {
      expect(AccessDeniedError.isAccessDeniedError(new Error('x'))).toBe(false);
    });

    it('returns false for strings', () => {
      expect(AccessDeniedError.isAccessDeniedError('not an error')).toBe(false);
    });

    it('returns false for null', () => {
      expect(AccessDeniedError.isAccessDeniedError(null)).toBe(false);
    });

    it('returns false for plain objects', () => {
      expect(AccessDeniedError.isAccessDeniedError({ message: 'Access denied' })).toBe(false);
    });
  });
});

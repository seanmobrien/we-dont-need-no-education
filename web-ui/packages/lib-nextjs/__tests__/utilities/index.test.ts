/* @jest-environment node */

/**
 * Tests for utility helpers: isAbortError and SessionTokenKey
 */

import { isAbortError } from '../../src/utilities/is-abort-error';
import { SessionTokenKey } from '../../src/utilities/session-token-key';

describe('isAbortError', () => {
  it('returns true for DOMException with name AbortError', () => {
    const err = new DOMException('The operation was aborted.', 'AbortError');
    expect(isAbortError(err)).toBe(true);
  });

  it('returns false for DOMException with different name', () => {
    const err = new DOMException('Something else', 'NotFoundError');
    expect(isAbortError(err)).toBe(false);
  });

  it('returns false for a regular Error', () => {
    expect(isAbortError(new Error('abort'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAbortError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAbortError(undefined)).toBe(false);
  });

  it('returns false for a plain object', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isAbortError('AbortError')).toBe(false);
  });
});

describe('SessionTokenKey', () => {
  // jest.env-vars.ts sets NEXT_PUBLIC_HOSTNAME = 'http://test-run.localhost'
  // http → no __Secure- prefix

  it('returns authjs.session-token for http hostname', () => {
    expect(SessionTokenKey()).toBe('authjs.session-token');
  });

  it('returns __Secure-authjs.session-token for https hostname', () => {
    const { __clearEnvCacheForTests } = require('@compliance-theater/env');
    const original = process.env['NEXT_PUBLIC_HOSTNAME'];
    process.env['NEXT_PUBLIC_HOSTNAME'] = 'https://secure.example.com';
    __clearEnvCacheForTests();

    try {
      expect(SessionTokenKey()).toBe('__Secure-authjs.session-token');
    } finally {
      process.env['NEXT_PUBLIC_HOSTNAME'] = original;
      __clearEnvCacheForTests();
    }
  });

  it('returns a non-empty string', () => {
    expect(typeof SessionTokenKey()).toBe('string');
    expect(SessionTokenKey().length).toBeGreaterThan(0);
  });
});

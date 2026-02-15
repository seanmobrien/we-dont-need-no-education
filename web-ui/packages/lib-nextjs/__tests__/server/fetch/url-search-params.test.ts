/* @jest-environment node */

import { normalizeRequestInit } from '../../../src/server/fetch/fetch-server';

describe('normalizeRequestInit', () => {
  it('should convert URLSearchParams body to string and set Content-Type', () => {
    const params = new URLSearchParams();
    params.append('foo', 'bar');
    params.append('baz', 'qux');

    const [url, options] = normalizeRequestInit({
      requestInfo: 'https://example.com',
      requestInit: {
        method: 'POST',
        body: params,
      },
      defaults: {},
    });

    expect(url).toBe('https://example.com');
    expect(options.body).toBe(params.toString());
    expect(options.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      }),
    );
  });

  it('should not overwrite existing Content-Type when converting URLSearchParams', () => {
    const params = new URLSearchParams({ foo: 'bar' });
    const customContentType =
      'application/x-www-form-urlencoded; charset=iso-8859-1';

    const [, options] = normalizeRequestInit({
      requestInfo: 'https://example.com',
      requestInit: {
        method: 'POST',
        headers: {
          'Content-Type': customContentType,
        },
        body: params,
      },
    });

    expect(options.body).toBe(params.toString());
    // Should respect the user provided header, although naive merge might append.
    // The current implementation of mergeHeaders appends or overwrites?
    // Let's check expectations. Ideally logic should be smart enough.
    // If logic simply appends default, we might get double headers which is fine for some, but strict check here.
    // For now, let's just ensure our code sets it if missing.

    // Actually, let's just check it contains the custom one.
    expect(options.headers).toMatchObject({
      'Content-Type': customContentType,
    });
  });

  it('should handle non-URLSearchParams body normally', () => {
    const body = JSON.stringify({ foo: 'bar' });
    const [, options] = normalizeRequestInit({
      requestInfo: 'https://example.com',
      requestInit: {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      },
    });

    expect(options.body).toBe(body);
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
    });
  });
});

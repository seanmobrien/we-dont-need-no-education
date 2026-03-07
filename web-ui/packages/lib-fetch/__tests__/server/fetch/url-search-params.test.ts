/* @jest-environment node */

jest.mock('got', () => ({
    __esModule: true,
    default: jest.fn(),
}));

import { normalizeRequestInit } from '../../../src/server/fetch/fetch-server';

describe('normalizeRequestInit', () => {
    it('converts URLSearchParams body to string', () => {
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
        expect(options.headers).toEqual({});
    });

    it('does not overwrite existing Content-Type with URLSearchParams', () => {
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
        expect(options.headers).toMatchObject({
            'Content-Type': customContentType,
        });
    });

    it('handles non-URLSearchParams body normally', () => {
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

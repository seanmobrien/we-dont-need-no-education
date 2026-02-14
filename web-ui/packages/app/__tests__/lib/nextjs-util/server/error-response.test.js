"use strict";
let parseResponseOptions;
let errorResponseFactory;
beforeAll(async () => {
    try {
        const undici = require('undici');
        if (!globalThis.Response && undici.Response) {
            globalThis.Response = undici.Response;
        }
        if (!globalThis.Request && undici.Request) {
            globalThis.Request = undici.Request;
        }
        if (!globalThis.Headers && undici.Headers) {
            globalThis.Headers = undici.Headers;
        }
        if (!globalThis.fetch && undici.fetch) {
            globalThis.fetch = undici.fetch;
        }
    }
    catch {
    }
    const mod = await import('@/lib/nextjs-util/server/error-response');
    parseResponseOptions = mod.parseResponseOptions;
    errorResponseFactory = mod.errorResponseFactory;
});
describe('parseResponseOptions', () => {
    test('string + number => message and status', () => {
        const res = parseResponseOptions('oops', 400);
        expect(res).toMatchObject({ status: 400, message: 'oops' });
        expect(res.cause).toBeUndefined();
        expect(res.source).toBeUndefined();
    });
    test('Error + string => cause from error.name, message override', () => {
        const err = new Error('boom');
        const res = parseResponseOptions(err, 'override');
        expect(res.status).toBe(500);
        expect(res.message).toBe('boom - override');
        expect(res.cause).toBe('Error');
    });
    test('options with source + Error => source kept, message from Error, cause name', () => {
        const err = new Error('x');
        const res = parseResponseOptions({ status: 404, source: 'route' }, err);
        expect(res.status).toBe(404);
        expect(res.source).toBe('route');
        expect(res.cause).toBe('Error');
        expect(res.message).toBe('x');
    });
    test('number only => status set, default message', () => {
        const res = parseResponseOptions(500);
        expect(res.status).toBe(500);
        expect(res.message).toBe('An error occurred');
    });
    test('Error only => default status, message from error, cause name', () => {
        const res = parseResponseOptions(new TypeError('bad'));
        expect(res.status).toBe(500);
        expect(res.message).toBe('bad');
        expect(res.cause).toBe('TypeError');
    });
    test('string + options => options override status/source, message from string', () => {
        const res = parseResponseOptions('auth failed', {
            status: 401,
            source: 'auth',
        });
        expect(res.status).toBe(401);
        expect(res.message).toBe('auth failed');
        expect(res.source).toBe('auth');
    });
    test('options with cause carrying source extracts source and stringifies cause', () => {
        const causeWithSource = Object.assign(new Error('hi'), { source: 'svc' });
        const res = parseResponseOptions({ cause: causeWithSource });
        expect(res.status).toBe(500);
        expect(res.message).toBe('An error occurred');
        expect(res.source).toBe('svc');
        expect(res.cause).toBe('Error');
    });
});
describe('errorResponseFactory', () => {
    test('serializes message and status correctly', async () => {
        const r = errorResponseFactory(404, 'Not found');
        expect(r.status).toBe(404);
        expect(r.headers.get('Content-Type')).toBe('application/json');
        const body = await r.json();
        expect(body).toEqual({ error: 'Not found', status: 404 });
    });
    test('derives from Error input', async () => {
        const r = errorResponseFactory(new Error('boom'));
        expect(r.status).toBe(500);
        const body = await r.json();
        expect(body).toEqual({ error: 'boom', status: 500, cause: 'Error' });
    });
});
//# sourceMappingURL=error-response.test.js.map
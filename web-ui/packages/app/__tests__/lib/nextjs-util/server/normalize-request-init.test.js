import { normalizeRequestInit } from '@/lib/nextjs-util/server/fetch/fetch-server';
if (!global.Headers) {
    global.Headers = Headers;
}
describe('normalizeRequestInit', () => {
    describe('Basic Normalization', () => {
        it('should handle string URL', () => {
            const [url, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: undefined,
            });
            expect(url).toBe('https://example.com');
            expect(options.method).toBe('GET');
        });
        it('should handle URL object', () => {
            const [url, options] = normalizeRequestInit({
                requestInfo: new URL('https://example.com/foo'),
                requestInit: undefined,
            });
            expect(url).toBe('https://example.com/foo');
            expect(options.method).toBe('GET');
        });
        it('should handle RequestInfo object with URL', () => {
            const [url, options] = normalizeRequestInit({
                requestInfo: { url: 'https://example.com/bar', method: 'POST' },
                requestInit: undefined,
            });
            expect(url).toBe('https://example.com/bar');
            expect(options.method).toBe('POST');
        });
        it('should throw on invalid input', () => {
            expect(() => normalizeRequestInit({
                requestInfo: null,
                requestInit: undefined,
            })).toThrow('Invalid requestInfo');
        });
    });
    describe('Defaults and Overrides', () => {
        it('should apply defaults when no init provided', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: undefined,
                defaults: { timeout: { request: 5000 } },
            });
            expect(options.timeout).toEqual({ request: 5000 });
        });
        it('should allow init to override defaults', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: { method: 'POST' },
                defaults: { method: 'GET' },
            });
            expect(options.method).toBe('POST');
        });
    });
    describe('Header Merging', () => {
        it('should merge headers regardless of case', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: { headers: { 'content-type': 'application/json' } },
                defaults: { headers: { 'Content-Type': 'text/plain' } },
            });
            expect(options.headers?.['Content-Type']).toEqual([
                'text/plain',
                'application/json',
            ]);
        });
        it('should merge array values', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: { headers: { 'X-Custom': ['v3', 'v4'] } },
                defaults: { headers: { 'X-Custom': ['v1', 'v2'] } },
            });
            expect(options.headers?.['X-Custom']).toEqual(['v1', 'v2', 'v3', 'v4']);
        });
        it('should append string to array', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: { headers: { 'X-List': 'item3' } },
                defaults: { headers: { 'X-List': ['item1', 'item2'] } },
            });
            expect(options.headers?.['X-List']).toEqual(['item1', 'item2', 'item3']);
        });
        it('should append array to string', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: { headers: { 'X-List': ['item2', 'item3'] } },
                defaults: { headers: { 'X-List': 'item1' } },
            });
            expect(options.headers?.['X-List']).toEqual(['item1', 'item2', 'item3']);
        });
        it('should concatenate User-Agent with space', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: { headers: { 'User-Agent': 'MyApp/1.0' } },
                defaults: { headers: { 'User-Agent': 'BaseLib/2.0' } },
            });
            expect(options.headers?.['User-Agent']).toBe('BaseLib/2.0 MyApp/1.0');
        });
        it('should ignore null/undefined values', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: {
                    headers: {
                        'X-Null': null,
                        'X-Undefined': undefined,
                    },
                },
                defaults: { headers: { 'X-Valid': 'true' } },
            });
            expect(options.headers).toEqual({ 'X-Valid': 'true' });
        });
    });
    describe('Body Handling', () => {
        it('should convert body: null to undefined', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: { body: null },
            });
            expect(options.body).toBeUndefined();
        });
        it('should pass through other body types', () => {
            const [_, options] = normalizeRequestInit({
                requestInfo: 'https://example.com',
                requestInit: { body: 'some-data' },
            });
            expect(options.body).toBe('some-data');
        });
    });
});
//# sourceMappingURL=normalize-request-init.test.js.map
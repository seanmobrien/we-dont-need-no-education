import { fetch as mockFetch } from '@/lib/nextjs-util/server/fetch';
describe('openapi route', () => {
    beforeEach(() => {
        process.env.MEM0_API_HOST = 'https://mem0.example';
        process.env.MEM0_API_BASE_PATH = 'api/v1';
        process.env.NEXT_PUBLIC_HOSTNAME = 'https://app.example';
    });
    it('replaces MEM0 host in url fields and remaps paths', async () => {
        const original = {
            openapi: '3.0.0',
            url: 'https://mem0.example/api/v1/info',
            paths: {
                '/api/v1/foo': { get: {} },
                '/mcp/internal': { get: {} },
            },
        };
        mockFetch.mockResolvedValue({
            text: async () => JSON.stringify(original),
        });
        const { GET: handler } = await import('@/app/openapi.json/route');
        const req = new Request('http://localhost/openapi');
        const res = await handler();
        expect(res).toBeDefined();
        const json = await res.json();
        expect(json.url).toBe('https://app.example/api/v1/info');
        expect(Object.keys(json.paths)).toContain('/api/memory/foo');
        expect(Object.keys(json.paths)).not.toContain('/mcp/internal');
    });
    it('does not modify empty url fields and preserves non-matching paths', async () => {
        const original = {
            openapi: '3.0.0',
            url: '',
            paths: {
                '/api/v1/bar': { get: {} },
                '/other/path': { post: {} },
            },
        };
        mockFetch.mockResolvedValueOnce({
            text: async () => JSON.stringify(original),
        });
        const { GET: handler } = await import('@/app/openapi.json/route');
        const req = new Request('http://localhost/openapi');
        const res = await handler();
        const json = await res.json();
        expect(json.url).toBe('');
        expect(Object.keys(json.paths)).toContain('/api/memory/bar');
        expect(Object.keys(json.paths)).toContain('/other/path');
    });
});
//# sourceMappingURL=app-openapi-json-route.test.js.map
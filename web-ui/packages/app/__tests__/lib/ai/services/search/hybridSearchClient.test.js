import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
setupImpersonationMock();
const fetchMock = jest.fn();
jest.mock('@/lib/nextjs-util/server/fetch', () => ({
    fetch: (...args) => fetchMock(...args),
}));
import { hybridDocumentSearchFactory } from '@/lib/ai/services/search/HybridDocumentSearch';
import { hybridPolicySearchFactory } from '@/lib/ai/services/search/HybridPolicySearch';
import { HybridSearchClient } from '@/lib/ai/services/search/HybridSearchBase';
class TestClient extends HybridSearchClient {
    getSearchIndexName() {
        return 'test-index';
    }
    appendScopeFilter(_payload) {
    }
    static exposeParseId(meta) {
        return this.parseId(meta);
    }
    static exposeParseMetadata(meta) {
        return this.parseMetadata(meta);
    }
    static exposeParseResponse(json, query, options) {
        return this.parseResponse(json, query, options);
    }
}
const makeEmbeddingService = () => ({
    embed: jest.fn().mockResolvedValue([0.11, 0.22, 0.33]),
});
describe('HybridSearchClient tests', () => {
    const mockConsole = hideConsoleOutput();
    afterEach(() => {
        mockConsole.dispose();
    });
    describe('HybridSearchClient static helpers', () => {
        test('parseId extracts id when present', () => {
            const id = TestClient.exposeParseId({
                attributes: [{ key: 'id', value: 123 }],
            });
            expect(id).toBe('123');
        });
        test('parseId returns undefined when absent', () => {
            const id = TestClient.exposeParseId({
                attributes: [{ key: 'other', value: 'x' }],
            });
            expect(id).toBeUndefined();
        });
        test('parseMetadata collapses sequentially numbered keys into arrays', () => {
            const meta = TestClient.exposeParseMetadata({
                attributes: [
                    { key: 'tag1', value: 'a' },
                    { key: 'tag2', value: 'b' },
                    { key: 'single', value: 'x' },
                    { key: 'single', value: 'y' },
                    { key: 'other', value: 'z' },
                ],
            });
            expect(meta).toEqual({ tag: ['a', 'b'], single: ['x', 'y'], other: 'z' });
        });
        test('parseResponse returns empty results on missing value array', () => {
            const env = TestClient.exposeParseResponse({}, 'q', {});
            expect(env).toEqual({ results: [] });
        });
        test('parseResponse throws on error block', () => {
            expect(() => TestClient.exposeParseResponse({ error: { code: 'Bad', message: 'boom' } }, 'q', {})).toThrow(/boom/);
        });
        test('parseResponse maps hits, total & continuationToken', () => {
            const env = TestClient.exposeParseResponse({
                value: [
                    {
                        id: 'fallback-id',
                        content: 'Hello',
                        metadata: { attributes: [{ key: 'id', value: 'meta-id' }] },
                        '@search.score': 5.5,
                    },
                ],
                '@odata.count': 42,
                '@odata.nextLink': 'token123',
            }, 'hello', {});
            expect(env.results).toHaveLength(1);
            expect(env.results[0].id).toBe('meta-id');
            expect(env.total).toBe(42);
            expect(env.continuationToken).toBe('token123');
        });
    });
    describe('HybridDocumentSearch.hybridSearch', () => {
        beforeEach(() => {
            fetchMock.mockReset();
        });
        test('builds payload with vector k minimum of 50 when topK < 50', async () => {
            const embeddingService = makeEmbeddingService();
            fetchMock.mockResolvedValue({ json: async () => ({ value: [] }) });
            const client = hybridDocumentSearchFactory({ embeddingService });
            await client.hybridSearch('test query', { hitsPerPage: 5 });
            expect(embeddingService.embed).toHaveBeenCalledWith('test query');
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.vectorQueries[0].k).toBe(50);
            expect(body.top).toBe(5);
        });
        test('uses provided hitsPerPage as k when >= 50', async () => {
            const embeddingService = makeEmbeddingService();
            fetchMock.mockResolvedValue({ json: async () => ({ value: [] }) });
            const client = hybridDocumentSearchFactory({ embeddingService });
            await client.hybridSearch('long', { hitsPerPage: 80 });
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.vectorQueries[0].k).toBe(80);
        });
        test('adds skip for page > 1', async () => {
            const embeddingService = makeEmbeddingService();
            fetchMock.mockResolvedValue({ json: async () => ({ value: [] }) });
            const client = hybridDocumentSearchFactory({ embeddingService });
            await client.hybridSearch('query', { hitsPerPage: 10, page: 3 });
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.skip).toBe(20);
        });
        test('applies document scope & id filters (AND + OR logic)', async () => {
            const embeddingService = makeEmbeddingService();
            fetchMock.mockResolvedValue({ json: async () => ({ value: [] }) });
            const client = hybridDocumentSearchFactory({ embeddingService });
            const docOpts = {
                scope: ['email', 'attachment'],
                emailId: 'E123',
            };
            await client.hybridSearch('query', docOpts);
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.filter).toMatch(/document_type/);
            expect(body.filter).toMatch(/email_id/);
            expect(body.filter).toMatch(/\(.*document_type.*or.*document_type.*\)/);
            expect(body.filter).toMatch(/\) and metadata\/attributes.*email_id/);
        });
    });
    describe('HybridPolicySearch.hybridSearch', () => {
        beforeEach(() => {
            fetchMock.mockReset();
        });
        test('applies policy scope filter (OR of mapped values)', async () => {
            const embeddingService = makeEmbeddingService();
            fetchMock.mockResolvedValue({ json: async () => ({ value: [] }) });
            const client = hybridPolicySearchFactory({ embeddingService });
            const polOpts = {
                scope: ['state'],
            };
            await client.hybridSearch('policy query', polOpts);
            const body = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(body.filter).toMatch(/document_type/);
            expect(body.filter).toContain("'2'");
        });
    });
    describe('HybridSearchClient.hybridSearch error handling', () => {
        test('wraps and rethrows fetch/network errors', async () => {
            mockConsole.setup();
            const embeddingService = makeEmbeddingService();
            fetchMock.mockImplementation(() => {
                throw new Error('network fail');
            });
            const client = hybridDocumentSearchFactory({ embeddingService });
            let error = undefined;
            await client.hybridSearch('fail query').catch((err) => (error = err));
            expect(error).toBeDefined();
            expect(error.message).toContain('network fail');
        });
    });
});
//# sourceMappingURL=hybridSearchClient.test.js.map
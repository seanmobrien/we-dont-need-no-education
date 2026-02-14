const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    flushDb: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
};
jest.mock('@compliance-theater/redis', () => ({
    getRedisClient: jest.fn().mockResolvedValue(mockRedisClient),
    closeRedisClient: jest.fn().mockResolvedValue(undefined),
}));
import { openai } from '@ai-sdk/openai';
import { generateText, wrapLanguageModel } from 'ai';
import { cacheWithRedis } from '../../../../lib/ai/middleware/cacheWithRedis/cacheWithRedis';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
import { metricsCollector } from '../../../../lib/ai/middleware/cacheWithRedis/metrics';
const createMockMiddleware = (mockResponse) => ({
    wrapGenerate: async () => {
        return mockResponse;
    },
    transformParams: async ({ params }) => params,
});
const wrapMockMiddleware = (model, mockResponse) => wrapLanguageModel({
    model: wrapLanguageModel({
        model: model,
        middleware: [createMockMiddleware(mockResponse)],
    }),
    middleware: [cacheWithRedis],
});
describe('Cache Success-Only Functionality', () => {
    beforeEach(() => {
        metricsCollector.reset();
        mockRedisClient.get.mockResolvedValue(null);
    });
    it('should cache successful responses', async () => {
        const baseModel = openai('gpt-4o-mini');
        const successMiddleware = createMockMiddleware({
            content: [{ type: 'text', text: 'This is a successful response' }],
            finishReason: 'stop',
            usage: { totalTokens: 10 },
            warnings: undefined,
        });
        const successModel = wrapLanguageModel({
            model: wrapLanguageModel({
                model: baseModel,
                middleware: [successMiddleware],
            }),
            middleware: [cacheWithRedis],
        });
        const result = await generateText({
            model: successModel,
            messages: [{ role: 'user', content: 'Test successful response' }],
        });
        expect(result.text).toBe('This is a successful response');
        const metrics = metricsCollector.getMetrics();
        expect(metrics.successfulCaches).toBe(1);
        expect(metrics.cacheErrors).toBe(0);
    });
    it('should NOT cache error responses', async () => {
        const mockConsole = hideConsoleOutput();
        mockConsole.setup();
        try {
            const baseModel = openai('gpt-4o-mini');
            const errorModel = wrapMockMiddleware(baseModel, {
                content: [{ type: 'text', text: '' }],
                finishReason: 'error',
                usage: { totalTokens: 10 },
                warnings: ['API Error occurred'],
            });
            const result = await generateText({
                model: errorModel,
                messages: [{ role: 'user', content: 'Test error response' }],
            });
            expect(result.text).toBe('');
            const metrics = metricsCollector.getMetrics();
            expect(metrics.successfulCaches).toBe(0);
        }
        finally {
            mockConsole.dispose();
        }
    });
    it('should NOT cache content filter responses initially', async () => {
        const baseModel = openai('gpt-4o-mini');
        const filterModel = wrapMockMiddleware(baseModel, {
            content: [{ type: 'text', text: 'Filtered content' }],
            finishReason: 'content-filter',
            usage: { totalTokens: 5 },
            warnings: undefined,
        });
        const result = await generateText({
            model: filterModel,
            messages: [{ role: 'user', content: 'Test content filter response' }],
        });
        expect(result.text).toBe('Filtered content');
        const metrics = metricsCollector.getMetrics();
        expect(metrics.successfulCaches).toBe(0);
        expect(metrics.problematicResponses).toBe(1);
    });
    it('should NOT cache responses with warnings initially', async () => {
        const mockConsole = hideConsoleOutput();
        mockConsole.setup();
        try {
            const baseModel = openai('gpt-4o-mini');
            const warningModel = wrapMockMiddleware(baseModel, {
                content: [{ type: 'text', text: 'Response with warnings' }],
                finishReason: 'stop',
                usage: { totalTokens: 15 },
                warnings: ['Rate limit warning'],
            });
            const result = await generateText({
                model: warningModel,
                messages: [{ role: 'user', content: 'Test warning response' }],
            });
            expect(result.text).toBe('Response with warnings');
            const metrics = metricsCollector.getMetrics();
            expect(metrics.successfulCaches).toBe(0);
            expect(metrics.problematicResponses).toBe(1);
        }
        finally {
            mockConsole.dispose();
        }
    });
    it('should NOT cache empty text responses', async () => {
        const baseModel = openai('gpt-4o-mini');
        const emptyModel = wrapMockMiddleware(baseModel, {
            content: [{ type: 'text', text: '' }],
            finishReason: 'stop',
            usage: { totalTokens: 1 },
            warnings: undefined,
        });
        const result = await generateText({
            model: emptyModel,
            messages: [{ role: 'user', content: 'Test empty response' }],
        });
        expect(result.text).toBe('');
        const metrics = metricsCollector.getMetrics();
        expect(metrics.successfulCaches).toBe(0);
    });
});
//# sourceMappingURL=cache-success-only.test.js.map
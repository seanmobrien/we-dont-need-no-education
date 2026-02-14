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
import { cacheWithRedis } from '@/lib/ai/middleware/cacheWithRedis/cacheWithRedis';
import { metricsCollector } from '@/lib/ai/middleware/cacheWithRedis/metrics';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
jest.mock('@ai-sdk/openai', () => ({
    openai: jest.fn(() => ({
        doGenerate: jest.fn(async () => ({
            content: [{ type: 'text', text: 'The answer is 4' }],
            finishReason: 'stop',
            usage: { totalTokens: 10 },
            warnings: undefined,
        })),
        provider: 'openai',
        modelId: 'gpt-4o-mini',
    })),
}));
describe('Cache Basic Functionality', () => {
    const mockConsole = hideConsoleOutput();
    beforeEach(() => {
        metricsCollector.reset();
        mockRedisClient.get.mockResolvedValue(null);
    });
    afterEach(() => {
        mockConsole.dispose();
    });
    it('should cache and retrieve responses correctly', async () => {
        const cachedResponse = JSON.stringify({
            content: [{ type: 'text', text: 'The answer is 4' }],
            finishReason: 'stop',
            usage: { totalTokens: 10 },
            warnings: undefined,
        });
        mockRedisClient.get
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(cachedResponse);
        const model = wrapLanguageModel({
            model: openai('gpt-4o-mini'),
            middleware: [cacheWithRedis],
        });
        const testMessage = 'What is 2 + 2?';
        const result1 = await generateText({
            model,
            messages: [{ role: 'user', content: testMessage }],
        });
        expect(result1.text).toBe('The answer is 4');
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(expect.stringContaining('ai-cache:'), 86400, expect.stringContaining('The answer is 4'));
        let metrics = metricsCollector.getMetrics();
        expect(metrics.cacheMisses).toBe(1);
        expect(metrics.cacheHits).toBe(0);
        expect(metrics.successfulCaches).toBe(1);
        const result2 = await generateText({
            model,
            messages: [{ role: 'user', content: testMessage }],
        });
        expect(result2.text).toBe('The answer is 4');
        metrics = metricsCollector.getMetrics();
        expect(metrics.cacheMisses).toBe(1);
        expect(metrics.cacheHits).toBe(1);
        expect(metrics.hitRate).toBeCloseTo(0.5);
    });
    it('should generate different cache keys for different messages', async () => {
        const model = wrapLanguageModel({
            model: openai('gpt-4o-mini'),
            middleware: [cacheWithRedis],
        });
        mockRedisClient.get.mockResolvedValue(null);
        await generateText({
            model,
            messages: [{ role: 'user', content: 'What is 2 + 2?' }],
        });
        await generateText({
            model,
            messages: [{ role: 'user', content: 'What is 3 + 3?' }],
        });
        const metrics = metricsCollector.getMetrics();
        expect(metrics.cacheMisses).toBe(2);
        expect(metrics.cacheHits).toBe(0);
        expect(metrics.successfulCaches).toBe(2);
        expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2);
        const calls = mockRedisClient.setEx.mock.calls;
        expect(calls[0][0]).not.toEqual(calls[1][0]);
    });
    it('should handle Redis errors gracefully', async () => {
        mockConsole.setup();
        mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
        const model = wrapLanguageModel({
            model: openai('gpt-4o-mini'),
            middleware: [cacheWithRedis],
        });
        const result = await generateText({
            model,
            messages: [{ role: 'user', content: 'Test with Redis down' }],
        });
        expect(result.text).toBe('The answer is 4');
        const metrics = metricsCollector.getMetrics();
        expect(metrics.cacheErrors).toBeGreaterThan(0);
    });
    it('should record error metrics when Redis fails', async () => {
        metricsCollector.recordError('test-key', 'Test error');
        const metrics = metricsCollector.getMetrics();
        expect(metrics.cacheErrors).toBe(1);
    });
});
//# sourceMappingURL=cache-basic.test.js.map
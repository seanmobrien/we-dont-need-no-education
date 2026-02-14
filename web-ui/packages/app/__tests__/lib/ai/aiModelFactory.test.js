jest.mock('@/lib/ai/middleware', () => ({
    retryRateLimitMiddlewareFactory: jest.fn(),
    setNormalizedDefaultsMiddleware: jest.fn(),
    rateLimitMiddleware: jest.fn(),
    createChatHistoryMiddlewareEx: jest.fn(),
    wrapChatHistoryMiddleware: jest.fn(),
    tokenStatsMiddleware: jest.fn(),
    tokenStatsWithQuotaMiddleware: jest.fn(),
    tokenStatsLoggingOnlyMiddleware: jest.fn(),
    cacheWithRedis: jest.fn(),
    getRedisClient: jest.fn(),
}));
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AiModelTypeValues, AiModelTypeValue_LoFi, AiModelTypeValue_HiFi, AiModelTypeValue_Completions, AiModelTypeValue_Embedding, AiModelTypeValue_GeminiPro, AiModelTypeValue_GeminiFlash, AiModelTypeValue_GoogleEmbedding, } from '@/lib/ai/core/unions';
import { isAiModelType, isAiLanguageModelType } from '@/lib/ai/core/guards';
describe('AI Model Types', () => {
    it('should include all expected model types', () => {
        expect(AiModelTypeValues).toEqual([
            'lofi',
            'hifi',
            'google:lofi',
            'google:hifi',
            'completions',
            'embedding',
            'gemini-pro',
            'gemini-flash',
            'google-embedding',
            'azure:lofi',
            'azure:hifi',
            'azure:completions',
            'azure:embedding',
            'google:completions',
            'google:embedding',
            'google:gemini-2.0-flash',
        ]);
    });
    it('should export correct constants', () => {
        expect(AiModelTypeValue_LoFi).toBe('lofi');
        expect(AiModelTypeValue_HiFi).toBe('hifi');
        expect(AiModelTypeValue_Completions).toBe('completions');
        expect(AiModelTypeValue_Embedding).toBe('embedding');
        expect(AiModelTypeValue_GeminiPro).toBe('gemini-pro');
        expect(AiModelTypeValue_GeminiFlash).toBe('gemini-flash');
        expect(AiModelTypeValue_GoogleEmbedding).toBe('google-embedding');
    });
});
describe('AI Model Type Guards', () => {
    it('should correctly identify valid AI model types', () => {
        expect(isAiModelType('lofi')).toBe(true);
        expect(isAiModelType('hifi')).toBe(true);
        expect(isAiModelType('completions')).toBe(true);
        expect(isAiModelType('embedding')).toBe(true);
        expect(isAiModelType('gemini-pro')).toBe(true);
        expect(isAiModelType('gemini-flash')).toBe(true);
        expect(isAiModelType('google-embedding')).toBe(true);
        expect(isAiModelType('invalid-model')).toBe(false);
    });
    it('should correctly identify language model types (excluding embeddings)', () => {
        expect(isAiLanguageModelType('lofi')).toBe(true);
        expect(isAiLanguageModelType('hifi')).toBe(true);
        expect(isAiLanguageModelType('completions')).toBe(true);
        expect(isAiLanguageModelType('gemini-pro')).toBe(true);
        expect(isAiLanguageModelType('gemini-flash')).toBe(true);
        expect(isAiLanguageModelType('embedding')).toBe(false);
        expect(isAiLanguageModelType('google-embedding')).toBe(false);
        expect(isAiLanguageModelType('invalid-model')).toBe(false);
    });
});
describe('AI Model Factory Integration', () => {
    beforeEach(() => {
    });
    it('should be importable without errors', async () => {
        expect(async () => {
            const { aiModelFactory } = await import('@/lib/ai/aiModelFactory');
            expect(typeof aiModelFactory).toBe('function');
        }).not.toThrow();
    });
    it('should define createGoogleEmbeddingModel function', async () => {
        const { createGoogleEmbeddingModel } = await import('@/lib/ai/aiModelFactory');
        expect(typeof createGoogleEmbeddingModel).toBe('function');
    });
    it('should define model availability control functions', async () => {
        const { disableModel, enableModel, disableProvider, enableProvider, temporarilyDisableModel, isModelAvailable, isProviderAvailable, getModelAvailabilityStatus, resetModelAvailability, handleAzureRateLimit, handleGoogleRateLimit, } = await import('@/lib/ai/aiModelFactory');
        expect(typeof disableModel).toBe('function');
        expect(typeof enableModel).toBe('function');
        expect(typeof disableProvider).toBe('function');
        expect(typeof enableProvider).toBe('function');
        expect(typeof temporarilyDisableModel).toBe('function');
        expect(typeof isModelAvailable).toBe('function');
        expect(typeof isProviderAvailable).toBe('function');
        expect(typeof getModelAvailabilityStatus).toBe('function');
        expect(typeof resetModelAvailability).toBe('function');
        expect(typeof handleAzureRateLimit).toBe('function');
        expect(typeof handleGoogleRateLimit).toBe('function');
    });
    it('should return a Promise from aiModelFactory', async () => {
        const { aiModelFactory } = await import('@/lib/ai/aiModelFactory');
        const result = aiModelFactory('lofi');
        expect(result).toBeInstanceOf(Promise);
        const model = await result;
        expect(model).toBeDefined();
    });
});
describe('Model Availability Management', () => {
    let modelControls;
    beforeEach(async () => {
        modelControls = await import('@/lib/ai/aiModelFactory');
        modelControls.resetModelAvailability();
    });
    it('should have all models available by default', async () => {
        expect(modelControls.isModelAvailable('azure:hifi')).toBe(true);
        expect(modelControls.isModelAvailable('google:hifi')).toBe(true);
        expect(await modelControls.isProviderAvailable('azure')).toBe(true);
        expect(await modelControls.isProviderAvailable('google')).toBe(true);
    });
    it('should be able to disable and enable specific models', async () => {
        await modelControls.disableModel('azure:hifi');
        expect(await modelControls.isModelAvailable('azure:hifi')).toBe(false);
        expect(await modelControls.isModelAvailable('google:hifi')).toBe(true);
        await modelControls.enableModel('azure:hifi');
        expect(await modelControls.isModelAvailable('azure:hifi')).toBe(true);
    });
    it('should be able to disable and enable entire providers', async () => {
        await modelControls.disableProvider('azure');
        expect(await modelControls.isModelAvailable('azure:hifi')).toBe(false);
        expect(await modelControls.isModelAvailable('azure:lofi')).toBe(false);
        expect(await modelControls.isModelAvailable('azure:embedding')).toBe(false);
        expect(await modelControls.isProviderAvailable('azure')).toBe(false);
        expect(await modelControls.isProviderAvailable('google')).toBe(true);
        await modelControls.enableProvider('azure');
        expect(await modelControls.isProviderAvailable('azure')).toBe(true);
    });
    it('should support temporary model disabling', (done) => {
        modelControls.temporarilyDisableModel('azure:hifi', 50);
        expect(modelControls.isModelAvailable('azure:hifi')).toBe(false);
        setTimeout(() => {
            expect(modelControls.isModelAvailable('azure:hifi')).toBe(true);
            done();
        }, 60);
    });
    it('should provide availability status for debugging', async () => {
        modelControls.disableModel('azure:hifi');
        modelControls.disableModel('google:embedding');
        const status = modelControls.getModelAvailabilityStatus();
        expect(status['azure:hifi']).toBe(false);
        expect(status['google:embedding']).toBe(false);
    });
    it('should handle Azure rate limits', async () => {
        modelControls.handleAzureRateLimit(50);
        expect(modelControls.isModelAvailable('azure:hifi')).toBe(false);
        expect(modelControls.isModelAvailable('azure:lofi')).toBe(false);
        expect(modelControls.isModelAvailable('azure:embedding')).toBe(false);
        expect(modelControls.isModelAvailable('google:hifi')).toBe(true);
    });
    it('should handle Google rate limits', async () => {
        modelControls.handleGoogleRateLimit(50);
        expect(modelControls.isModelAvailable('google:hifi')).toBe(false);
        expect(modelControls.isModelAvailable('google:gemini-pro')).toBe(false);
        expect(modelControls.isModelAvailable('google:embedding')).toBe(false);
        expect(modelControls.isModelAvailable('azure:hifi')).toBe(true);
    });
});
//# sourceMappingURL=aiModelFactory.test.js.map
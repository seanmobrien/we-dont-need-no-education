import { setupImpersonationMock } from '@/__tests__/jest.mock-impersonation';
setupImpersonationMock();
import { describe, it, expect, beforeEach, afterEach, jest, } from '@jest/globals';
import { retryRateLimitMiddlewareFactory } from '@/lib/ai/middleware/key-rate-limiter/middleware';
jest.mock('@/lib/ai/middleware/key-rate-limiter/queue-manager');
jest.mock('@/lib/ai/middleware/key-rate-limiter/metrics');
jest.mock('@/lib/ai/aiModelFactory');
describe('retryRateLimitMiddlewareFactory', () => {
    beforeEach(() => {
    });
    afterEach(() => {
    });
    describe('factory function', () => {
        it('should create middleware with required methods', async () => {
            const middleware = await retryRateLimitMiddlewareFactory({
                modelClass: 'hifi',
                failover: { primaryProvider: 'azure', fallbackProvider: 'google' },
            });
            expect(middleware).toBeDefined();
            expect(typeof middleware.wrapGenerate).toBe('function');
            expect(typeof middleware.wrapStream).toBe('function');
            expect(typeof middleware.transformParams).toBe('function');
            expect(typeof middleware.rateLimitContext).toBe('function');
        });
        it('should return rate limit context', async () => {
            const context = {
                modelClass: 'hifi',
                failover: {
                    primaryProvider: 'azure',
                    fallbackProvider: 'google',
                },
            };
            const middleware = await retryRateLimitMiddlewareFactory(context);
            const retrievedContext = middleware.rateLimitContext();
            expect(retrievedContext).toEqual(context);
        });
        it('should handle different model classifications', async () => {
            const modelClasses = [
                'hifi',
                'lofi',
                'completions',
                'embedding',
            ];
            for (const modelClass of modelClasses) {
                const middleware = await retryRateLimitMiddlewareFactory({
                    modelClass,
                    failover: { primaryProvider: 'azure', fallbackProvider: 'google' },
                });
                expect(middleware).toBeDefined();
                expect(middleware.rateLimitContext()?.modelClass).toBe(modelClass);
            }
        });
    });
});
//# sourceMappingURL=key-rate-limiter.test.js.map
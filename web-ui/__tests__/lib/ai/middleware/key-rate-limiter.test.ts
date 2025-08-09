import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { retryRateLimitMiddlewareFactory } from '@/lib/ai/middleware/key-rate-limiter/middleware';

// Mock dependencies
jest.mock('@/lib/ai/middleware/key-rate-limiter/queue-manager');
jest.mock('@/lib/ai/middleware/key-rate-limiter/metrics');
jest.mock('@/lib/ai/aiModelFactory');

describe('retryRateLimitMiddlewareFactory', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
  });

  afterEach(() => {
    // jest.restoreAllMocks();
  });

  describe('factory function', () => {
    it('should create middleware with required methods', () => {
      const middleware = retryRateLimitMiddlewareFactory({ 
        modelClass: 'hifi', 
        failover: { primaryProvider: 'azure', fallbackProvider: 'google' } 
      });
      
      expect(middleware).toBeDefined();
      expect(typeof middleware.wrapGenerate).toBe('function');
      expect(typeof middleware.wrapStream).toBe('function');
      expect(typeof middleware.transformParams).toBe('function');
      expect(typeof middleware.rateLimitContext).toBe('function');
    });

    it('should return rate limit context', () => {
      const context = { 
        modelClass: 'hifi' as const, 
        failover: { primaryProvider: 'azure' as const, fallbackProvider: 'google' as const } 
      };
      const middleware = retryRateLimitMiddlewareFactory(context);
      
      const retrievedContext = middleware.rateLimitContext();
      expect(retrievedContext).toEqual(context);
    });

    it('should handle different model classifications', () => {
      const modelClasses = ['hifi', 'lofi', 'completions', 'embedding'] as const;
      
      modelClasses.forEach(modelClass => {
        const middleware = retryRateLimitMiddlewareFactory({ 
          modelClass, 
          failover: { primaryProvider: 'azure', fallbackProvider: 'google' } 
        });
        
        expect(middleware).toBeDefined();
        expect(middleware.rateLimitContext()?.modelClass).toBe(modelClass);
      });
    });
  });
});
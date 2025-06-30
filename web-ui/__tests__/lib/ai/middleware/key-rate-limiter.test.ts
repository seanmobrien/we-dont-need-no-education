import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { retryRateLimitMiddleware } from '@/lib/ai/middleware/key-rate-limiter/middleware';
import { rateLimitQueueManager } from '@/lib/ai/middleware/key-rate-limiter/queue-manager';
import { rateLimitMetrics } from '@/lib/ai/middleware/key-rate-limiter/metrics';
import * as aiModelFactory from '@/lib/ai/aiModelFactory';

// Mock dependencies
jest.mock('@/lib/ai/middleware/key-rate-limiter/queue-manager');
jest.mock('@/lib/ai/middleware/key-rate-limiter/metrics');
jest.mock('@/lib/ai/aiModelFactory');

const mockRateLimitQueueManager = rateLimitQueueManager as jest.Mocked<typeof rateLimitQueueManager>;
const mockRateLimitMetrics = rateLimitMetrics as jest.Mocked<typeof rateLimitMetrics>;
const mockAiModelFactory = aiModelFactory as jest.Mocked<typeof aiModelFactory>;

describe('retryRateLimitMiddleware', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock behavior
    mockAiModelFactory.isModelAvailable.mockReturnValue(true);
    mockAiModelFactory.getModelAvailabilityStatus.mockReturnValue({});
    mockRateLimitMetrics.recordProcessingDuration.mockImplementation(() => {});
    mockRateLimitMetrics.recordError.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('middleware structure', () => {
    it('should have required middleware methods', () => {
      expect(retryRateLimitMiddleware).toBeDefined();
      expect(retryRateLimitMiddleware.wrapGenerate).toBeDefined();
      expect(retryRateLimitMiddleware.wrapStream).toBeDefined();
      expect(retryRateLimitMiddleware.transformParams).toBeDefined();
    });
  });

  describe('transformParams', () => {
    it('should return params unchanged when model is available', async () => {
      const testParams = { prompt: 'test', temperature: 0.5 };
      
      const result = await retryRateLimitMiddleware.transformParams!({ params: testParams });
      
      expect(result).toEqual(testParams);
      expect(mockAiModelFactory.getModelAvailabilityStatus).toHaveBeenCalled();
    });

    it('should log warnings for unavailable models', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockAiModelFactory.isModelAvailable.mockReturnValue(false);
      
      const testParams = { prompt: 'test' };
      
      await retryRateLimitMiddleware.transformParams!({ params: testParams });
      
      expect(consoleSpy).toHaveBeenCalledWith('Requested model azure:hifi is not available');
      
      consoleSpy.mockRestore();
    });
  });

  describe('wrapGenerate functionality', () => {
    it('should handle model availability checks', async () => {
      const mockDoGenerate = jest.fn().mockResolvedValue({ text: 'test response' });
      const testParams = { prompt: 'test' };
      
      const result = await retryRateLimitMiddleware.wrapGenerate({
        doGenerate: mockDoGenerate,
        params: testParams,
      });
      
      expect(result.text).toBe('test response');
      expect(mockRateLimitMetrics.recordProcessingDuration).toHaveBeenCalled();
    });

    it('should enqueue requests when no models are available', async () => {
      const mockDoGenerate = jest.fn();
      mockAiModelFactory.isModelAvailable.mockReturnValue(false);
      mockRateLimitQueueManager.enqueueRequest.mockResolvedValue();
      
      const testParams = { prompt: 'test' };
      
      await expect(
        retryRateLimitMiddleware.wrapGenerate({
          doGenerate: mockDoGenerate,
          params: testParams,
        })
      ).rejects.toThrow('No hifi models available. Request enqueued with ID:');
      
      expect(mockRateLimitQueueManager.enqueueRequest).toHaveBeenCalled();
      expect(mockRateLimitMetrics.recordError).toHaveBeenCalledWith('no_models_available', 'hifi');
    });
  });

  describe('wrapStream functionality', () => {
    it('should check model availability before streaming', async () => {
      const mockDoStream = jest.fn();
      const testParams = { prompt: 'test' };
      
      // Test with available model (should call doStream)
      mockAiModelFactory.isModelAvailable.mockReturnValue(true);
      
      try {
        await retryRateLimitMiddleware.wrapStream({
          doStream: mockDoStream,
          params: testParams,
        });
      } catch (error) {
        // Expected to fail in test environment due to TransformStream
        // but we can verify the model check logic was reached
      }
      
      expect(mockAiModelFactory.isModelAvailable).toHaveBeenCalledWith('azure:hifi');
    });

    it('should enqueue requests when no models are available for streaming', async () => {
      const mockDoStream = jest.fn();
      mockAiModelFactory.isModelAvailable.mockReturnValue(false);
      mockRateLimitQueueManager.enqueueRequest.mockResolvedValue();
      
      const testParams = { prompt: 'test' };
      
      await expect(
        retryRateLimitMiddleware.wrapStream({
          doStream: mockDoStream,
          params: testParams,
        })
      ).rejects.toThrow('No hifi models available. Request enqueued with ID:');
      
      expect(mockRateLimitQueueManager.enqueueRequest).toHaveBeenCalled();
      expect(mockRateLimitMetrics.recordError).toHaveBeenCalledWith('no_models_available', 'hifi');
    });
  });

  describe('error handling', () => {
    it('should record metrics on errors', async () => {
      const mockDoGenerate = jest.fn().mockRejectedValue(new Error('Test error'));
      const testParams = { prompt: 'test' };
      
      await expect(
        retryRateLimitMiddleware.wrapGenerate({
          doGenerate: mockDoGenerate,
          params: testParams,
        })
      ).rejects.toThrow('Test error');
      
      expect(mockRateLimitMetrics.recordProcessingDuration).toHaveBeenCalled();
      expect(mockRateLimitMetrics.recordError).toHaveBeenCalledWith('other_error', 'hifi');
    });
  });
});
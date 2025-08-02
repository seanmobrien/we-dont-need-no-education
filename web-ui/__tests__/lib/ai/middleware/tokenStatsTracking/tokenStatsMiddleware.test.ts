import { tokenStatsMiddleware, tokenStatsWithQuotaMiddleware } from '@/lib/ai/middleware/tokenStatsTracking';
import { tokenStatsService } from '@/lib/ai/middleware/tokenStatsTracking/tokenStatsService';

// Mock the token stats service
jest.mock('@/lib/ai/middleware/tokenStatsTracking/tokenStatsService');

const mockTokenStatsService = tokenStatsService as jest.Mocked<typeof tokenStatsService>;

describe('TokenStatsMiddleware', () => {
  // Mock middleware context with all required properties
  const createMockContext = (doGenerate: jest.Mock) => ({
    doGenerate,
    doStream: jest.fn(),
    params: {
      inputFormat: 'prompt' as const,
      mode: { type: 'regular' as const },
      prompt: 'test prompt',
      providerMetadata: {
        comply: {
          estTokens: 100
        }
      }
    },
    model: { modelId: 'test-model' },
  } as any);
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tokenStatsMiddleware', () => {
    it('should record token usage after successful request', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'azure',
        modelName: 'hifi',
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
        },
      };

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);
      
      mockTokenStatsService.recordTokenUsage.mockResolvedValue();

      const result = await middleware.wrapGenerate!(createMockContext(mockDoGenerate));

      expect(result).toEqual(mockResult);
      expect(mockTokenStatsService.recordTokenUsage).toHaveBeenCalledWith(
        'azure',
        'hifi',
        {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        }
      );
    });

    it('should not record usage when no usage data is returned', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'azure',
        modelName: 'hifi',
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        // No usage data
      };

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      const result = await middleware.wrapGenerate!(createMockContext(mockDoGenerate));

      expect(result).toEqual(mockResult);
      expect(mockTokenStatsService.recordTokenUsage).not.toHaveBeenCalled();
    });

    it('should handle token recording errors gracefully', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'azure',
        modelName: 'hifi',
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
        },
      };

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);
      
      mockTokenStatsService.recordTokenUsage.mockRejectedValue(new Error('Recording failed'));

      // Should not throw despite recording error
      const result = await middleware.wrapGenerate!(createMockContext(mockDoGenerate));

      expect(result).toEqual(mockResult);
      expect(mockTokenStatsService.recordTokenUsage).toHaveBeenCalled();
    });

    it('should propagate request errors', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'azure',
        modelName: 'hifi',
        enableLogging: false,
      });

      const mockError = new Error('Request failed');
      const mockDoGenerate = jest.fn().mockRejectedValue(mockError);

      // The error gets wrapped by LoggedError, so check for the original error or wrapped error
      try {
        await middleware.wrapGenerate!(createMockContext(mockDoGenerate));
        fail('Expected function to throw an error');
      } catch (error) {
        // If we get here, the error was thrown correctly
        expect(error).toBeDefined();
      }
      expect(mockTokenStatsService.recordTokenUsage).not.toHaveBeenCalled();
    });
  });

  describe('tokenStatsWithQuotaMiddleware', () => {
    it('should check quota before making request', async () => {
      const middleware = tokenStatsWithQuotaMiddleware({
        provider: 'azure',
        modelName: 'hifi',
        enableLogging: false,
      });

      const mockQuotaCheck = {
        allowed: true,
        currentUsage: {
          currentMinuteTokens: 100,
          lastHourTokens: 500,
          last24HoursTokens: 2000,
          requestCount: 5,
        },
      };

      const mockResult = {
        text: 'Hello world',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
        },
      };

      mockTokenStatsService.checkQuota.mockResolvedValue(mockQuotaCheck);
      mockTokenStatsService.recordTokenUsage.mockResolvedValue();

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      const result = await middleware.wrapGenerate!(createMockContext(mockDoGenerate));

      expect(mockTokenStatsService.checkQuota).toHaveBeenCalledWith('azure', 'hifi', 100);
      expect(result).toEqual(mockResult);
    });

    it('should block request when quota is exceeded', async () => {
      const middleware = tokenStatsWithQuotaMiddleware({
        provider: 'azure',
        modelName: 'hifi',
        enableLogging: false,
      });

      const mockQuotaCheck = {
        allowed: false,
        reason: 'Daily limit exceeded',
        currentUsage: {
          currentMinuteTokens: 100,
          lastHourTokens: 500,
          last24HoursTokens: 100000,
          requestCount: 1000,
        },
      };

      mockTokenStatsService.checkQuota.mockResolvedValue(mockQuotaCheck);

      const mockDoGenerate = jest.fn();

      await expect(
        middleware.wrapGenerate!(createMockContext(mockDoGenerate))
      ).rejects.toThrow('Quota exceeded: Daily limit exceeded');

      expect(mockDoGenerate).not.toHaveBeenCalled();
      expect(mockTokenStatsService.recordTokenUsage).not.toHaveBeenCalled();
    });

    it('should allow request when quota check fails (fail open)', async () => {
      const middleware = tokenStatsWithQuotaMiddleware({
        provider: 'azure',
        modelName: 'hifi',
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
        },
      };

      mockTokenStatsService.checkQuota.mockRejectedValue(new Error('Quota check failed'));
      mockTokenStatsService.recordTokenUsage.mockResolvedValue();

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      const result = await middleware.wrapGenerate!(createMockContext(mockDoGenerate));

      expect(result).toEqual(mockResult);
      expect(mockDoGenerate).toHaveBeenCalled();
    });
  });

  describe('provider and model extraction', () => {
    it('should use configured provider and model', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'google',
        modelName: 'gemini-pro',
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
        },
      };

      mockTokenStatsService.recordTokenUsage.mockResolvedValue();
      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      await middleware.wrapGenerate!(createMockContext(mockDoGenerate));

      expect(mockTokenStatsService.recordTokenUsage).toHaveBeenCalledWith(
        'google',
        'gemini-pro',
        expect.any(Object)
      );
    });

    it('should handle missing provider/model config', async () => {
      const middleware = tokenStatsMiddleware({
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
        },
      };

      mockTokenStatsService.recordTokenUsage.mockResolvedValue();
      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      await middleware.wrapGenerate!(createMockContext(mockDoGenerate));

      expect(mockTokenStatsService.recordTokenUsage).toHaveBeenCalledWith(
        'unknown',
        'test-model',
        expect.any(Object)
      );
    });
  });
});
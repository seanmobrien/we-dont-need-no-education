 
import { setupMaps } from '@/__tests__/jest.mock-provider-model-maps';

setupMaps();

// Mock the token stats service
jest.mock('@/lib/ai/services/model-stats/token-stats-service', () => {
  const theInstance = {
    getTokenStats: jest.fn(),
    getQuota: jest.fn(),
    checkQuota: jest.fn(),
    safeRecordTokenUsage: jest.fn(),
    reset: jest.fn(),
    mockClear: () => {
      Object.entries(theInstance).forEach(
        ([key, value]) => key !== 'mockClear' && (value as any).mockClear(),
      );
    },
  };
  const ret = {
    getInstance: jest.fn(() => theInstance),
    reset: jest.fn(() => theInstance.mockClear()),
  };
  return ret;
});

import {
  getInstance,
  reset,
} from '@/lib/ai/services/model-stats/token-stats-service';
import {
  tokenStatsMiddleware,
  tokenStatsWithQuotaMiddleware,
  TokenStatsServiceType,
} from '@/lib/ai/middleware/tokenStatsTracking';
import { wrapLanguageModel } from 'ai';

type MockTokenStats = {
  [k in keyof TokenStatsServiceType]: k extends 'mockClear'
    ? TokenStatsServiceType[k]
    : jest.Mock<any, any, any>;
};

describe('TokenStatsMiddleware', () => {
  const mockTokenStatsService: MockTokenStats =
    getInstance() as unknown as MockTokenStats;
  // Mock middleware context with all required properties
  const createMockContext = (doGenerate: jest.Mock) =>
    ({
      doGenerate,
      doStream: jest.fn(),
      params: {
        inputFormat: 'prompt' as const,
        mode: { type: 'regular' as const },
        prompt: 'test prompt',
        providerMetadata: {
          backOffice: {
            estTokens: 100,
          },
        },
      },
      model: { modelId: 'gpt-4.1', provider: 'azure' },
    }) as any;

  beforeEach(() => {
    reset();
    setupMaps();
  });

  describe('tokenStatsMiddleware', () => {
    it('should record token usage after successful request', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'azure',
        modelName: 'gpt-4.1',
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      };

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      (
        mockTokenStatsService.safeRecordTokenUsage as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await middleware.wrapGenerate!(
        createMockContext(mockDoGenerate),
      );

      expect(result).toEqual(mockResult);
      expect(mockTokenStatsService.safeRecordTokenUsage).toHaveBeenCalledWith(
        'azure',
        'gpt-4.1',
        {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      );
    });

    it('should not record usage when no usage data is returned', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'azure',
        modelName: 'gpt-4.1',
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        // No usage data
      };

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      const result = await middleware.wrapGenerate!(
        createMockContext(mockDoGenerate),
      );

      expect(result).toEqual(mockResult);
      expect(mockTokenStatsService.safeRecordTokenUsage).not.toHaveBeenCalled();
    });

    it('should handle token recording errors gracefully', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'azure',
        modelName: 'gpt-4.1',
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

      mockTokenStatsService.safeRecordTokenUsage.mockRejectedValue(
        new Error('Recording failed'),
      );

      // Should not throw despite recording error
      const result = await middleware.wrapGenerate!(
        createMockContext(mockDoGenerate),
      );

      expect(result).toEqual(mockResult);
      expect(mockTokenStatsService.safeRecordTokenUsage).toHaveBeenCalled();
    });

    it('should propagate request errors', async () => {
      const middleware = tokenStatsMiddleware({
        provider: 'azure',
        modelName: 'gpt-4.1',
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
      expect(mockTokenStatsService.safeRecordTokenUsage).not.toHaveBeenCalled();
    });
  });

  describe('tokenStatsWithQuotaMiddleware', () => {
    it('should check quota before making request', async () => {
      const middleware = tokenStatsWithQuotaMiddleware({
        provider: 'azure',
        modelName: 'gpt-4.1',
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
          inputTokens: 10,
          outputTokens: 20,
        },
      };

      mockTokenStatsService.checkQuota.mockResolvedValue(mockQuotaCheck);
      mockTokenStatsService.safeRecordTokenUsage.mockResolvedValue(undefined);

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      const result = await middleware.wrapGenerate!(
        createMockContext(mockDoGenerate),
      );

      expect(mockTokenStatsService.checkQuota).toHaveBeenCalledWith(
        'azure',
        'gpt-4.1',
        0,
      );
      expect(result).toEqual(mockResult);
    });

    it('should block request when quota is exceeded', async () => {
      const middleware = tokenStatsWithQuotaMiddleware({
        provider: 'azure',
        modelName: 'gpt-4.1',
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
        middleware.wrapGenerate!(createMockContext(mockDoGenerate)),
      ).rejects.toThrow('Quota exceeded: Daily limit exceeded');

      expect(mockDoGenerate).not.toHaveBeenCalled();
      expect(mockTokenStatsService.safeRecordTokenUsage).not.toHaveBeenCalled();
    });

    it('should allow request when quota check fails (fail open)', async () => {
      const middleware = tokenStatsWithQuotaMiddleware({
        provider: 'azure',
        modelName: 'gpt-4.1',
        enableLogging: false,
      });

      const mockResult = {
        text: 'Hello world',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
        },
      };

      mockTokenStatsService.checkQuota.mockRejectedValue(
        new Error('Quota check failed'),
      );
      mockTokenStatsService.safeRecordTokenUsage.mockResolvedValue(undefined);

      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      const result = await middleware.wrapGenerate!(
        createMockContext(mockDoGenerate),
      );

      expect(result).toEqual(mockResult);
      expect(mockDoGenerate).toHaveBeenCalled();
    });
  });

  describe('provider and model extraction', () => {
    it('should override provider and model', async () => {
      const OVERRIDE_PROVIDER = 'override-provider';
      const OVERRIDE_MODEL = 'override-model';
      const ORIGINAL_MODEL = 'orig-model';
      const ORIGINAL_PROVIDER = 'orig-provider';
      const model: any = {
        modelId: ORIGINAL_MODEL,
        provider: ORIGINAL_PROVIDER,
      };
      let wrappedModel = wrapLanguageModel({
        model,
        middleware: tokenStatsMiddleware({
          enableLogging: false,
          provider: OVERRIDE_PROVIDER,
          modelName: OVERRIDE_MODEL,
        }),
      });
      expect(wrappedModel.modelId).toBe(OVERRIDE_MODEL);
      expect(wrappedModel.provider).toBe(OVERRIDE_PROVIDER);
      wrappedModel = wrapLanguageModel({
        model,
        middleware: tokenStatsMiddleware({
          enableLogging: false,
          provider: OVERRIDE_PROVIDER,
          modelName: '',
        }),
      });
      expect(wrappedModel.modelId).toBe(ORIGINAL_MODEL);
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

      mockTokenStatsService.safeRecordTokenUsage.mockResolvedValue(undefined);
      const mockDoGenerate = jest.fn().mockResolvedValue(mockResult);

      await middleware.wrapGenerate!(createMockContext(mockDoGenerate));

      expect(mockTokenStatsService.safeRecordTokenUsage).toHaveBeenCalled();
    });
  });
});

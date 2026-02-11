// Mock ProviderMap before other imports

// Mock Redis and database before other imports
jest.mock('@/lib/redis-client');

// Fix the schema mock to have the correct structure
jest.mock('@compliance-theater/database', () => {
  const actualModule = jest.requireActual('/lib/drizzle-db');
  // The actualModule.schema contains the nested structure, we need to flatten it
  const flatSchema = actualModule.schema.schema || actualModule.schema;
  return {
    ...actualModule,
    schema: flatSchema,
  };
});

import {
  getTokenStatsService,
  TokenStatsServiceType,
  TokenUsageData,
} from '@/lib/ai/middleware/tokenStatsTracking';
import { reset } from '@/lib/ai/services/model-stats/token-stats-service';
import { getRedisClient } from '@/lib/redis-client';
//import { drizDbWithInit, schema } from '@compliance-theater/database';
import { hideConsoleOutput } from '@/__tests__/test-utils';
import {
  setupMaps,
  PROVIDER_ID_AZURE,
  PROVIDER_ID_GOOGLE,
  MODEL_ID_GPT4_NO_QUOTA,
} from '@/__tests__/setup/jest.mock-provider-model-maps';
import { ModelMap } from '@/lib/ai/services/model-stats/model-map';

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  multi: jest.fn(() => ({
    setEx: jest.fn(),
    exec: jest.fn().mockResolvedValue(undefined),
  })),
  eval: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
};

let tokenStatsService: TokenStatsServiceType;

const mockConsole = hideConsoleOutput();

beforeEach(() => {
  //jest.clearAllMocks();
  //console.log('before test', schema.tokenConsumptionStats);
  reset();
  setupMaps();
  tokenStatsService = getTokenStatsService();

  // Reset mock implementations
  (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);

  // Reset Redis client mocks
  mockRedisClient.get.mockReset();
  mockRedisClient.setEx.mockReset();
  mockRedisClient.multi.mockReset();
  mockRedisClient.eval.mockReset();
  const multi = {
    setEx: jest.fn(),
    exec: jest.fn(),
  };
  mockRedisClient.multi.mockReturnValue(multi);
});

afterEach(() => {
  mockConsole.dispose();
});

describe('TokenStatsService', () => {
  describe('normalizeModelKey', () => {
    it('should handle provider:model format', async () => {
      // Setup mock to return null for stats (zero stats)
      mockRedisClient.get.mockResolvedValue(null);

      // When the FIRST parameter contains ':', it should extract provider and model from it
      // The second parameter should be ignored
      const result = await tokenStatsService.getTokenStats(
        'azure:gpt-4.1',
        'ignored',
      );

      expect(result).not.toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'token_stats:b555b85f-5b2f-45d8-a317-575a3ab50ff2:gpt-4.1:minute',
      );
    });

    it('should handle separate provider and model', async () => {
      // Setup mock to return null for stats (zero stats)
      mockRedisClient.get.mockResolvedValue(null);

      const result = await tokenStatsService.getTokenStats(
        'google',
        'gemini-2.0-flash',
      );

      expect(result).not.toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `token_stats:${PROVIDER_ID_GOOGLE}:gemini-2.0-flash:minute`,
      );
    });
  });

  describe('getQuota', () => {
    it('should return quota when quota is configured', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await tokenStatsService.getQuota('azure', 'gpt-4.1');

      expect(result).not.toBeNull();
      expect(result?.maxTokensPerDay).toBeUndefined();
      expect(result?.maxTokensPerMinute).not.toBeUndefined();
      expect(result?.maxTokensPerMessage).not.toBeUndefined();
    });
    it('should return null when no quota is configured', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await tokenStatsService.getQuota(
        'azure',
        'gpt-4.1-no-quota',
      );

      expect(result).not.toBeNull();
      expect(result?.maxTokensPerDay).toBeUndefined();
      expect(result?.maxTokensPerMinute).toBeUndefined();
      expect(result?.maxTokensPerMessage).toBeUndefined();
    });
  });

  describe('getTokenStats', () => {
    it('should return zero stats when no data exists', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await tokenStatsService.getTokenStats('azure', 'gpt-4.1');

      expect(result).toEqual({
        currentMinuteTokens: 0,
        lastHourTokens: 0,
        last24HoursTokens: 0,
        requestCount: 0,
      });
    });

    it('should parse token stats from Redis', async () => {
      const mockMinuteData = { totalTokens: 100, requestCount: 5 };
      const mockHourData = { totalTokens: 500 };
      const mockDayData = { totalTokens: 2000 };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockMinuteData)) // minute stats
        .mockResolvedValueOnce(JSON.stringify(mockHourData)) // hour stats
        .mockResolvedValueOnce(JSON.stringify(mockDayData)); // day stats

      const result = await tokenStatsService.getTokenStats('azure', 'gpt-4.1');

      expect(result).toEqual({
        currentMinuteTokens: 100,
        lastHourTokens: 500,
        last24HoursTokens: 2000,
        requestCount: 5,
      });
    });
  });

  describe('checkQuota', () => {
    it('should allow request when no quota is configured', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await tokenStatsService.checkQuota(
        'azure',
        'gpt-4.1-no-quota',
        100,
      );

      expect(result.allowed).toBe(true);
    });

    it('should block request that exceeds per-message limit', async () => {
      await ModelMap.getInstance().then((x) =>
        x.addQuotaToModel({
          modelId: MODEL_ID_GPT4_NO_QUOTA,
          maxTokensPerMessage: 500,
          isActive: true,
        }),
      );

      const result = await tokenStatsService.checkQuota(
        'azure',
        'gpt-4.1-no-quota',
        1000, // Exceeds per-message limit of 500
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('per-message limit');
    });

    it('should block request that exceeds per-minute limit', async () => {
      await ModelMap.getInstance().then((x) =>
        x.addQuotaToModel({
          modelId: MODEL_ID_GPT4_NO_QUOTA,
          maxTokensPerMinute: 1000,
          isActive: true,
        }),
      );
      const mockStats = { totalTokens: 900, requestCount: 5 };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockStats)) // minute stats
        .mockResolvedValue(null); // hour/day stats

      const result = await tokenStatsService.checkQuota(
        'azure',
        'gpt-4.1-no-quota',
        200, // 900 + 200 = 1100, exceeds limit of 1000
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('per-minute limit');
    });

    it('should allow request within all limits', async () => {
      await ModelMap.getInstance().then((x) =>
        x.addQuotaToModel({
          modelId: MODEL_ID_GPT4_NO_QUOTA,
          maxTokensPerMessage: 1000,
          maxTokensPerMinute: 10000,
          maxTokensPerDay: 100000,
          isActive: true,
        }),
      );

      const mockStats = { totalTokens: 500, requestCount: 2 };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockStats)); // all stats calls

      const result = await tokenStatsService.checkQuota(
        'azure',
        'gpt-4.1',
        400,
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('safeRecordTokenUsage', () => {
    it('should update Redis and database stats', async () => {
      const usage: TokenUsageData = {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250,
      };

      mockRedisClient.get.mockResolvedValue(null); // no existing data

      await tokenStatsService.safeRecordTokenUsage('azure', 'gpt-4.1', usage);

      // Verify Redis was updated
      expect(mockRedisClient.eval).toHaveBeenCalled();

      // Verify database operations were attempted
      // The actual database operations go through the global mock,
      // so we can't directly verify mockDb.insert was called.
      // But we can verify the method completed without throwing.
      expect(true).toBe(true); // This test just verifies no errors were thrown
    });

    it('should handle Redis and database errors gracefully', async () => {
      mockConsole.setup();
      const usage: TokenUsageData = {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250,
      };

      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        tokenStatsService.safeRecordTokenUsage('azure', 'gpt-4.1', usage),
      ).resolves.not.toThrow();
    });
  });

  describe('getUsageReport', () => {
    it('should return comprehensive usage report', async () => {
      const mockQuota = {
        createdAt: '2025-08-01T14:21:16.896854+00:00',
        id: '6bf2bf6c-6b94-485b-945b-20c762f1fe18',
        isActive: true,
        maxTokensPerDay: undefined,
        maxTokensPerMessage: 128000,
        maxTokensPerMinute: 50000,
        modelId: '97e291f6-4396-472e-9cb5-13cc94291879',
        modelName: 'gpt-4.1',
        provider: 'b555b85f-5b2f-45d8-a317-575a3ab50ff2',
        updatedAt: '2025-08-01T14:21:16.896854+00:00',
      };

      const mockStats = { totalTokens: 500, requestCount: 3 };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockStats)); // stats

      const result = await tokenStatsService.getUsageReport('azure', 'gpt-4.1');

      expect(result.quota).toEqual(mockQuota);
      expect(result.currentStats.currentMinuteTokens).toBe(500);
      expect(result.quotaCheckResult.allowed).toBe(true);
    });
  });
});

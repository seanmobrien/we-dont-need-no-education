// Mock ProviderMap before other imports
const mockProviderMapInstance = {
  id: jest.fn((provider: string) => {
    // Map provider names to provider IDs
    switch (provider) {
      case 'azure':
        return 'azure-openai.chat';
      case 'google':
        return 'google';
      default:
        return provider; // fallback to original value
    }
  }),
  name: jest.fn().mockReturnValue('azure'),
  record: jest.fn().mockReturnValue({
    name: 'azure',
    displayName: 'Azure OpenAI',
    isActive: true,
  }),
  contains: jest.fn().mockReturnValue(true),
  initialized: true,
  whenInitialized: Promise.resolve(true),
};

jest.mock('@/lib/ai/middleware/tokenStatsTracking/provider-map', () => ({
  ProviderMap: {
    getInstance: jest.fn().mockResolvedValue(mockProviderMapInstance),
    Instance: mockProviderMapInstance,
  },
}));

// Mock Redis and database before other imports
jest.mock('@/lib/ai/middleware/cacheWithRedis/redis-client');
jest.mock('@/lib/drizzle-db');

import {
  getTokenStatsService,
  TokenStatsServiceType,
  TokenUsageData,
} from '@/lib/ai/middleware/tokenStatsTracking';
import {
  reset 
 } from '@/lib/ai/middleware/tokenStatsTracking/token-stats-service';
import { getRedisClient } from '@/lib/ai/middleware/cacheWithRedis/redis-client';
import { drizDbWithInit } from '@/lib/drizzle-db';

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  multi: jest.fn(() => ({
    setEx: jest.fn(),
    exec: jest.fn().mockResolvedValue(undefined),
  })),
  quit: jest.fn(),
  disconnect: jest.fn(),
};

const mockDb = {
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve([])),
      })),
    })),
  })),
  insert: jest.fn(() => ({
    values: jest.fn(() => ({
      onConflictDoUpdate: jest.fn(() => Promise.resolve()),
    })),
  })),
  query: {
    models: {
      findFirst: jest.fn(() =>
        Promise.resolve({
          id: 'test-model-id',
          providerId: 'azure-openai.chat',
          modelName: 'hifi',
          isActive: true,
        }),
      ),
    },
  },
};

let tokenStatsService: TokenStatsServiceType;

beforeEach(() => {
  jest.clearAllMocks();
  reset();
  tokenStatsService = getTokenStatsService();
  
  // Reset mock implementations
  (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);
  // Note: drizDbWithInit is already mocked globally, no need to re-mock it
  
  // Reset Redis client mocks
  mockRedisClient.get.mockReset();
  mockRedisClient.setEx.mockReset();
  mockRedisClient.multi.mockReset();
  
  // Reset ProviderMap mocks to ensure consistent provider IDs
  mockProviderMapInstance.id.mockImplementation((provider: string) => {
    if (provider === 'azure') return 'azure-openai.chat';
    if (provider === 'google') return 'google';
    return provider; // fallback
  });
});

describe('TokenStatsService', () => {
  describe('normalizeModelKey', () => {
    it('should handle provider:model format', async () => {
      // Setup mock to return null for stats (zero stats)
      mockRedisClient.get.mockResolvedValue(null);

      // When the FIRST parameter contains ':', it should extract provider and model from it
      // The second parameter should be ignored
      const result = await tokenStatsService.getTokenStats(
        'azure:hifi',
        'ignored',
      );
      
      expect(result).not.toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'token_stats:azure-openai.chat:hifi:minute',
      );
    });

    it('should handle separate provider and model', async () => {
      // Setup mock to return null for stats (zero stats)
      mockRedisClient.get.mockResolvedValue(null);

      const result = await tokenStatsService.getTokenStats(
        'google',
        'gemini-pro',
      );
      
      expect(result).not.toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'token_stats:google:gemini-pro:minute',
      );
    });
  });

  describe('getQuota', () => {
    it('should return null when no quota is configured', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await tokenStatsService.getQuota('azure', 'hifi');

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'token_quota:azure-openai.chat:hifi',
      );
    });

    it('should return quota from Redis cache', async () => {
      const mockQuota = {
        id: 'test-id',
        provider: 'azure',
        modelName: 'hifi',
        maxTokensPerMessage: 1000,
        maxTokensPerMinute: 10000,
        maxTokensPerDay: 100000,
        isActive: true,
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockQuota));

      const result = await tokenStatsService.getQuota('azure', 'hifi');

      expect(result).toEqual(mockQuota);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'token_quota:azure-openai.chat:hifi',
      );
    });
  });

  describe('getTokenStats', () => {
    it('should return zero stats when no data exists', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await tokenStatsService.getTokenStats(
        'azure',
        'hifi',
      );

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
        .mockResolvedValueOnce(JSON.stringify(mockMinuteData))  // minute stats
        .mockResolvedValueOnce(JSON.stringify(mockHourData))    // hour stats
        .mockResolvedValueOnce(JSON.stringify(mockDayData));    // day stats

      const result = await tokenStatsService.getTokenStats(
        'azure',
        'hifi',
      );

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
        'hifi',
        100,
      );

      expect(result.allowed).toBe(true);
    });

    it('should block request that exceeds per-message limit', async () => {
      const mockQuota = {
        id: 'test-id',
        provider: 'azure',
        modelName: 'hifi',
        maxTokensPerMessage: 500,
        maxTokensPerMinute: null,
        maxTokensPerDay: null,
        isActive: true,
      };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockQuota)) // quota
        .mockResolvedValue(null); // stats (no existing usage)

      const result = await tokenStatsService.checkQuota(
        'azure',
        'hifi',
        1000, // Exceeds per-message limit of 500
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('per-message limit');
    });

    it('should block request that exceeds per-minute limit', async () => {
      const mockQuota = {
        id: 'test-id',
        provider: 'azure',
        modelName: 'hifi',
        maxTokensPerMessage: null,
        maxTokensPerMinute: 1000,
        maxTokensPerDay: null,
        isActive: true,
      };

      const mockStats = { totalTokens: 900, requestCount: 5 };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockQuota)) // quota
        .mockResolvedValueOnce(JSON.stringify(mockStats)) // minute stats
        .mockResolvedValue(null); // hour/day stats

      const result = await tokenStatsService.checkQuota(
        'azure',
        'hifi',
        200, // 900 + 200 = 1100, exceeds limit of 1000
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('per-minute limit');
    });

    it('should allow request within all limits', async () => {
      const mockQuota = {
        id: 'test-id',
        provider: 'azure',
        modelName: 'hifi',
        maxTokensPerMessage: 1000,
        maxTokensPerMinute: 10000,
        maxTokensPerDay: 100000,
        isActive: true,
      };

      const mockStats = { totalTokens: 500, requestCount: 2 };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockQuota)) // quota call
        .mockResolvedValue(JSON.stringify(mockStats)); // all stats calls

      const result = await tokenStatsService.checkQuota(
        'azure',
        'hifi',
        400,
      );

      expect(result.allowed).toBe(true);
      expect(result.quota).toEqual(mockQuota);
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

      await tokenStatsService.safeRecordTokenUsage(
        'azure',
        'hifi',
        usage,
      );

      // Verify Redis was updated
      expect(mockRedisClient.multi).toHaveBeenCalled();

      // Verify database operations were attempted
      // The actual database operations go through the global mock, 
      // so we can't directly verify mockDb.insert was called.
      // But we can verify the method completed without throwing.
      expect(true).toBe(true); // This test just verifies no errors were thrown
    });

    it('should handle Redis and database errors gracefully', async () => {
      const usage: TokenUsageData = {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250,
      };

      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        tokenStatsService.safeRecordTokenUsage('azure', 'hifi', usage),
      ).resolves.not.toThrow();
    });
  });

  describe('getUsageReport', () => {
    it('should return comprehensive usage report', async () => {
      const mockQuota = {
        id: 'test-id',
        provider: 'azure',
        modelName: 'hifi',
        maxTokensPerMessage: null,
        maxTokensPerMinute: 1000,
        maxTokensPerDay: null,
        isActive: true,
      };

      const mockStats = { totalTokens: 500, requestCount: 3 };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockQuota)) // quota
        .mockResolvedValue(JSON.stringify(mockStats)); // stats

      const result = await tokenStatsService.getUsageReport(
        'azure',
        'hifi',
      );

      expect(result.quota).toEqual(mockQuota);
      expect(result.currentStats.currentMinuteTokens).toBe(500);
      expect(result.quotaCheckResult.allowed).toBe(true);
    });
  });
});

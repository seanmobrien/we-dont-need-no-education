import { tokenStatsService, TokenUsageData } from '@/lib/ai/middleware/tokenStatsTracking';
import { getRedisClient } from '@/lib/ai/middleware/cacheWithRedis/redis-client';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { modelQuotas, tokenConsumptionStats } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Mock Redis for testing
jest.mock('@/lib/ai/middleware/cacheWithRedis/redis-client');
jest.mock('@/lib/drizzle-db');

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  multi: jest.fn(() => ({
    setEx: jest.fn(),
    exec: jest.fn().mockResolvedValue(undefined),
  })),
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
      findFirst: jest.fn(() => Promise.resolve({
        id: 'test-model-id',
        provider: 'azure',
        modelName: 'hifi',
        isActive: true,
      })),
    },
  },
};

beforeEach(() => {
  // jest.clearAllMocks();
  (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);
  (drizDbWithInit as jest.Mock).mockImplementation((fn) => fn(mockDb));
});

describe('TokenStatsService', () => {
  describe('normalizeModelKey', () => {
    it('should handle provider:model format', async () => {
      // When modelName contains ':', it overrides provider and extracts both from modelName
      const result = await tokenStatsService.getTokenStats('ignored', 'azure:hifi');
      expect(mockRedisClient.get).toHaveBeenCalledWith('token_stats:azure:hifi:minute');
    });

    it('should handle separate provider and model', async () => {
      const result = await tokenStatsService.getTokenStats('google', 'gemini-pro');
      expect(mockRedisClient.get).toHaveBeenCalledWith('token_stats:google:gemini-pro:minute');
    });
  });

  describe('getQuota', () => {
    it('should return null when no quota is configured', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await tokenStatsService.getQuota('azure', 'hifi');
      
      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('token_quota:azure:hifi');
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
    });
  });

  describe('getTokenStats', () => {
    it('should return zero stats when no data exists', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await tokenStatsService.getTokenStats('azure', 'hifi');
      
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
        .mockResolvedValueOnce(JSON.stringify(mockMinuteData))
        .mockResolvedValueOnce(JSON.stringify(mockHourData))
        .mockResolvedValueOnce(JSON.stringify(mockDayData));
      
      const result = await tokenStatsService.getTokenStats('azure', 'hifi');
      
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
      
      const result = await tokenStatsService.checkQuota('azure', 'hifi', 100);
      
      expect(result.allowed).toBe(true);
    });

    it('should block request that exceeds per-message limit', async () => {
      const mockQuota = {
        id: 'test-id',
        provider: 'azure',
        modelName: 'hifi',
        maxTokensPerMessage: 500,
        isActive: true,
      };
      
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockQuota)) // quota
        .mockResolvedValue(null); // stats
      
      const result = await tokenStatsService.checkQuota('azure', 'hifi', 1000);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('per-message limit');
    });

    it('should block request that exceeds per-minute limit', async () => {
      const mockQuota = {
        id: 'test-id',
        provider: 'azure',
        modelName: 'hifi',
        maxTokensPerMinute: 1000,
        isActive: true,
      };
      
      const mockStats = { totalTokens: 900, requestCount: 5 };
      
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockQuota)) // quota
        .mockResolvedValueOnce(JSON.stringify(mockStats)) // minute stats
        .mockResolvedValue(null); // hour/day stats
      
      const result = await tokenStatsService.checkQuota('azure', 'hifi', 200);
      
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
        .mockResolvedValueOnce(JSON.stringify(mockQuota)) // quota
        .mockResolvedValue(JSON.stringify(mockStats)); // all stats
      
      const result = await tokenStatsService.checkQuota('azure', 'hifi', 400);
      
      expect(result.allowed).toBe(true);
      expect(result.quota).toEqual(mockQuota);
    });
  });

  describe('recordTokenUsage', () => {
    it('should update Redis and database stats', async () => {
      const usage: TokenUsageData = {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250,
      };
      
      mockRedisClient.get.mockResolvedValue(null); // no existing data
      
      await tokenStatsService.recordTokenUsage('azure', 'hifi', usage);
      
      // Verify Redis was updated
      expect(mockRedisClient.multi).toHaveBeenCalled();
      
      // Verify database was updated
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle Redis and database errors gracefully', async () => {
      const usage: TokenUsageData = {
        promptTokens: 100,
        completionTokens: 150,
        totalTokens: 250,
      };
      
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      // Should not throw
      await expect(tokenStatsService.recordTokenUsage('azure', 'hifi', usage)).resolves.not.toThrow();
    });
  });

  describe('getUsageReport', () => {
    it('should return comprehensive usage report', async () => {
      const mockQuota = {
        id: 'test-id',
        provider: 'azure',
        modelName: 'hifi',
        maxTokensPerMinute: 1000,
        isActive: true,
      };
      
      const mockStats = { totalTokens: 500, requestCount: 3 };
      
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockQuota)) // quota
        .mockResolvedValue(JSON.stringify(mockStats)); // stats
      
      const result = await tokenStatsService.getUsageReport('azure', 'hifi');
      
      expect(result.quota).toEqual(mockQuota);
      expect(result.currentStats.currentMinuteTokens).toBe(500);
      expect(result.quotaCheckResult.allowed).toBe(true);
    });
  });
});

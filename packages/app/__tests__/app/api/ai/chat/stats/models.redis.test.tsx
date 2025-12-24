/* @jest-environment node */
/**
 * Models Stats API (Redis source) Tests
 *
 * Covers the new ?source=redis branch in `/api/ai/chat/stats/models` which uses the
 * TokenStatsService fast path instead of aggregating from the database stats table.
 *
 * Contract / Branches:
 *  - Success with mixed models (one with quota, one without quota)
 *  - Fallback when getUsageReport throws (graceful zeroed stats)
 *
 * Important: We rely on the global jest.setup.ts mocks for drizzle. We ONLY override
 * the resolved value of drizDbWithInit (do not re-mock the module) to supply the
 * base models list returned by the select/from/innerJoin chain used in the route.
 */

import { NextRequest } from 'next/server';

// Mock BEFORE importing the route so the route captures our mocks.
const mockGetUsageReport = jest.fn();

jest.mock('@/lib/ai/services/model-stats/token-stats-service', () => ({
  getInstance: () => ({
    getUsageReport: mockGetUsageReport,
  }),
}));

jest.mock('@/lib/ai/aiModelFactory', () => ({
  isModelAvailable: () => true,
}));

// Import AFTER mocks
import { GET } from '@/app/api/ai/chat/stats/models/route';
// Import as namespace so we can spy on drizDbWithInit (it's not a jest.fn in global setup)
import * as drizzleDb from '@/lib/drizzle-db';

type BaseModelRecord = {
  id: string;
  modelName: string;
  displayName: string | null;
  description: string | null;
  isActive: boolean;
  providerId: string;
  providerName: string;
  providerDisplayName: string | null;
};

describe('/api/ai/chat/stats/models?source=redis', () => {
   
  let mockDb: any;
  beforeEach(() => {
    // jest.clearAllMocks();
    mockDb = drizzleDb.drizDb();
  });

  it('returns enriched stats for redis source with quota + no quota models', async () => {
    const baseModels: BaseModelRecord[] = [
      {
        id: '1',
        modelName: 'hifi',
        displayName: 'HiFi',
        description: 'High fidelity',
        isActive: true,
        providerId: 'azure-openai.chat',
        providerName: 'azure',
        providerDisplayName: 'Azure OpenAI',
      },
      {
        id: '2',
        modelName: 'gemini-pro',
        displayName: 'Gemini Pro',
        description: 'Google model',
        isActive: true,
        providerId: 'google',
        providerName: 'google',
        providerDisplayName: 'Google',
      },
    ];
    mockDb.__setRecords(baseModels);

    // First model has quota + usage
    mockGetUsageReport.mockImplementationOnce(async () => ({
      quota: {
        maxTokensPerMessage: 1000,
        maxTokensPerMinute: 5000,
        maxTokensPerDay: 100000,
      },
      currentStats: {
        currentMinuteTokens: 25,
        lastHourTokens: 250,
        last24HoursTokens: 2500,
        requestCount: 7,
      },
      quotaCheckResult: { allowed: true },
    }));
    // Second model has no quota (null) + different usage
    mockGetUsageReport.mockImplementationOnce(async () => ({
      quota: null,
      currentStats: {
        currentMinuteTokens: 0,
        lastHourTokens: 10,
        last24HoursTokens: 100,
        requestCount: 2,
      },
      quotaCheckResult: { allowed: true },
    }));

    const req = new NextRequest(
      'http://localhost:3000/api/ai/chat/stats/models?source=redis',
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.source).toBe('redis');
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(2);

    const [first, second] = json.data;
    // Shape assertions for first model
    expect(first).toMatchObject({
      id: '1',
      modelName: 'hifi',
      modelKey: 'azure:hifi',
      maxTokensPerMessage: 1000,
      maxTokensPerMinute: 5000,
      maxTokensPerDay: 100000,
      stats: {
        minute: {
          totalTokens: 25,
          promptTokens: 0,
          completionTokens: 0,
          requestCount: 7,
        },
        hour: { totalTokens: 250 },
        day: { totalTokens: 2500 },
      },
      quotaCheck: { allowed: true },
      source: 'redis',
    });

    // Second model fallback (no quota info)
    expect(second).toMatchObject({
      id: '2',
      modelName: 'gemini-pro',
      modelKey: 'google:gemini-pro',
      maxTokensPerMessage: null,
      maxTokensPerMinute: null,
      maxTokensPerDay: null,
      stats: {
        minute: { totalTokens: 0, requestCount: 2 },
        hour: { totalTokens: 10 },
        day: { totalTokens: 100 },
      },
      source: 'redis',
    });

    expect(mockGetUsageReport).toHaveBeenCalledTimes(2);
  });

  it('gracefully falls back when getUsageReport rejects', async () => {
    const baseModels: BaseModelRecord[] = [
      {
        id: '1',
        modelName: 'hifi',
        displayName: 'HiFi',
        description: null,
        isActive: true,
        providerId: 'azure-openai.chat',
        providerName: 'azure',
        providerDisplayName: 'Azure OpenAI',
      },
    ];

    mockDb.__setRecords(baseModels);
    mockGetUsageReport.mockRejectedValueOnce(new Error('boom'));

    const req = new NextRequest(
      'http://localhost:3000/api/ai/chat/stats/models?source=redis',
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    const model = json.data[0];
    expect(model.stats.minute.totalTokens).toBe(0);
    expect(model.stats.hour.totalTokens).toBe(0);
    expect(model.stats.day.totalTokens).toBe(0);
    expect(model.maxTokensPerMessage).toBeNull();
    expect(model.quotaCheck).toEqual({ allowed: true });
  });
});

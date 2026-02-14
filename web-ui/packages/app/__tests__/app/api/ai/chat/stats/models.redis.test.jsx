import { NextRequest } from 'next/server';
const mockGetUsageReport = jest.fn();
jest.mock('@/lib/ai/services/model-stats/token-stats-service', () => ({
    getInstance: () => ({
        getUsageReport: mockGetUsageReport,
    }),
}));
jest.mock('@/lib/ai/aiModelFactory', () => ({
    isModelAvailable: () => true,
}));
import { GET } from '@/app/api/ai/chat/stats/models/route';
import * as drizzleDb from '@compliance-theater/database/orm';
describe('/api/ai/chat/stats/models?source=redis', () => {
    let mockDb;
    beforeEach(() => {
        mockDb = drizzleDb.drizDb();
    });
    it('returns enriched stats for redis source with quota + no quota models', async () => {
        const baseModels = [
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
        const req = new NextRequest('http://localhost:3000/api/ai/chat/stats/models?source=redis');
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.source).toBe('redis');
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data).toHaveLength(2);
        const [first, second] = json.data;
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
        const baseModels = [
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
        const req = new NextRequest('http://localhost:3000/api/ai/chat/stats/models?source=redis');
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
//# sourceMappingURL=models.redis.test.jsx.map